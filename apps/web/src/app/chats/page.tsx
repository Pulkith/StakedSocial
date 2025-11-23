"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageCircle } from "lucide-react";
import { useMiniApp } from "@/contexts/miniapp-context";
import { getAllChats, type ChatMetadata, getChatMessages, saveChat } from "@/lib/chat-metadata";
import { getXMTPClient } from "@/lib/xmtp";
import { useSignMessage } from "wagmi";
import { io } from "socket.io-client";

export default function ChatsPage() {
  const router = useRouter();
  const { context, isMiniAppReady } = useMiniApp();
  const { signMessageAsync } = useSignMessage();
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract user data from context
  const user = context?.user;
  const username = user?.username || "@user";
  // Note: We'll fetch the wallet_address from the user API like in invite-friends
  const [walletAddress, setWalletAddress] = useState("");

  // Fetch user wallet address
  useEffect(() => {
    const fetchUserData = async () => {
      if (!username) return;

      try {
        const response = await fetch(`https://maia-api.ngrok-free.dev/user?username=${username.replace('@', '')}`);
        const userData = await response.json();
        if (userData?.wallet_address) {
          setWalletAddress(userData.wallet_address);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    if (isMiniAppReady && username) {
      fetchUserData();
    }
  }, [isMiniAppReady, username]);

  // Load chats from backend and localStorage
  useEffect(() => {
    const loadChats = async () => {
      setIsLoading(true);
      try {
        // Load from localStorage first
        const localChats = getAllChats();

        // Then fetch from backend
        try {
          const backendUrl = process.env.NEXT_PUBLIC_OPTIMISTIC_SERVER_URL || 'http://localhost:5001';
          const response = await fetch(`${backendUrl}/api/get-all-chats`);
          const data = await response.json();
          const backendChats = data.chats || {};

          // Convert backend chats to ChatMetadata format if needed
          Object.values(backendChats).forEach((chat: any) => {
            if (chat && chat.chatId && !localChats.find(c => c.chatId === chat.chatId)) {
              // Save backend chats to local storage
              saveChat(chat);
              localChats.push(chat);
            }
          });
        } catch (error) {
          console.warn("Could not fetch chats from backend:", error);
        }

        // Sort by last message time or created time
        localChats.sort((a, b) => {
          const timeA = a.lastMessageTime || a.createdAt;
          const timeB = b.lastMessageTime || b.createdAt;
          return timeB - timeA;
        });
        setChats(localChats);
      } catch (error) {
        console.error("Error loading chats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isMiniAppReady) {
      loadChats();
    }
  }, [isMiniAppReady]);

  // XMTP polling disabled - messages come from optimistic messaging

  // Listen for new chats from other users
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_OPTIMISTIC_SERVER_URL || 'http://localhost:5001', {
      reconnection: true,
    });

    socket.on('new_chat_created', (chatData: ChatMetadata) => {
      saveChat(chatData);
      setChats(prev => {
        const exists = prev.some(c => c.chatId === chatData.chatId);
        if (exists) return prev;
        return [chatData, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!isMiniAppReady) {
    return (
      <main className="flex-1">
        <section className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="w-full max-w-md mx-auto p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20 pb-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header with Create Chat Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Chats</h1>
            <p className="text-gray-600">Your conversations</p>
          </div>
          <button
            onClick={() => router.push('/invite')}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors shadow-lg"
            title="Create new chat"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Chats List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No chats yet</h3>
            <p className="text-gray-600 mb-6">Start a conversation with your friends</p>
            <button
              onClick={() => router.push('/invite')}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Chat
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {chats.map((chat) => {
              const hasUnread = (chat.unreadCount || 0) > 0;

              return (
                <div
                  key={chat.chatId}
                  onClick={() => router.push(`/chats/${chat.chatId}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-blue-200"
                >
                  <div className="flex items-start gap-4">
                    {/* Chat Icon */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-7 w-7 text-white" />
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3
                          className={`text-lg truncate ${
                            hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                          }`}
                        >
                          {chat.chatName}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTimestamp(chat.lastMessageTime || chat.createdAt)}
                        </span>
                      </div>

                      <p
                        className={`text-sm truncate ${
                          hasUnread ? 'font-medium text-gray-700' : 'text-gray-600'
                        }`}
                      >
                        {chat.lastMessage || `${chat.memberWallets.length} members`}
                      </p>
                    </div>

                    {/* Unread Badge */}
                    {hasUnread && (
                      <div className="bg-blue-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0">
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
