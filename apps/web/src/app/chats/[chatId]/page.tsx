"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send, Info, Check, CheckCheck, Trash2 } from "lucide-react";
import { useMiniApp } from "@/contexts/miniapp-context";
import { useSignMessage } from "wagmi";
import { getXMTPClient } from "@/lib/xmtp";
import {
  getChatById,
  getChatMessages,
  saveMessage,
  updateMessageStatus,
  deleteChat,
  type ChatMessage,
} from "@/lib/chat-metadata";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.chatId as string;
  const { context, isMiniAppReady } = useMiniApp();
  const { signMessageAsync } = useSignMessage();

  const [chat, setChat] = useState(getChatById(chatId));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract user data from context
  const user = context?.user;
  const username = user?.username || "@user";
  const [walletAddress, setWalletAddress] = useState("");

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  // Load messages
  useEffect(() => {
    if (chatId) {
      const loadedMessages = getChatMessages(chatId);
      setMessages(loadedMessages);
      scrollToBottom();
    }
  }, [chatId]);

  // Initialize XMTP conversation
  useEffect(() => {
    if (!signMessageAsync || !walletAddress || !chat) return;

    const initConversation = async () => {
      try {
        const client = await getXMTPClient(walletAddress, signMessageAsync);
        const conv = await client.conversations.getConversationById(chat.groupId);

        if (conv) {
          setConversation(conv);
          // Sync conversation to get latest messages
          await conv.sync();
        }
      } catch (error) {
        console.error("Error initializing conversation:", error);
      }
    };

    initConversation();
  }, [signMessageAsync, walletAddress, chat]);

  // Poll for new messages
  useEffect(() => {
    if (!conversation) return;

    const pollMessages = async () => {
      try {
        await conversation.sync();
        const xmtpMessages = await conversation.messages();

        // Convert XMTP messages to our format
        const formattedMessages: ChatMessage[] = xmtpMessages.map((msg: any) => ({
          id: msg.id,
          chatId: chatId,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          senderAddress: msg.senderAddress || msg.sender || walletAddress, // Use senderAddress instead of senderInboxId
          timestamp: msg.sentAt ? new Date(msg.sentAt).getTime() : Date.now(),
          status: 'sent' as const,
        }));

        // Merge with existing messages, avoiding duplicates
        setMessages(prev => {
          const newMessageIds = new Set(formattedMessages.map(m => m.id));
          const existingNonDuplicates = prev.filter(m => !newMessageIds.has(m.id) && !m.id.startsWith('temp-'));
          return [...existingNonDuplicates, ...formattedMessages];
        });

        // Save to local storage
        formattedMessages.forEach(msg => saveMessage(msg));
      } catch (error) {
        console.warn("Error polling messages:", error);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(pollMessages, 5000);

    // Initial poll
    pollMessages();

    return () => clearInterval(interval);
  }, [conversation, chatId, walletAddress]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      chatId: chatId,
      content: messageContent,
      senderAddress: walletAddress,
      timestamp: Date.now(),
      status: 'sending',
    };

    // Add optimistic message to UI
    setMessages(prev => [...prev, optimisticMessage]);
    saveMessage(optimisticMessage);
    scrollToBottom();

    try {
      // Send optimistically
      await conversation.sendOptimistic(messageContent);

      // Update status to sent
      updateMessageStatus(chatId, tempId, 'sent');
      setMessages(prev =>
        prev.map(msg => (msg.id === tempId ? { ...msg, status: 'sent' as const } : msg))
      );

      // Publish the message
      await conversation.publishMessages();

      // After publishing, sync to get the real message ID
      await conversation.sync();
      const xmtpMessages = await conversation.messages();
      const lastMessage = xmtpMessages[xmtpMessages.length - 1];

      if (lastMessage) {
        const realMessage: ChatMessage = {
          id: lastMessage.id,
          chatId: chatId,
          content: messageContent,
          senderAddress: walletAddress,
          timestamp: lastMessage.sentAt ? new Date(lastMessage.sentAt).getTime() : Date.now(),
          status: 'sent',
        };

        saveMessage(realMessage);

        // Replace optimistic message with real one
        setMessages(prev => prev.filter(msg => msg.id !== tempId).concat(realMessage));
      }
    } catch (error) {
      console.error("Error sending message:", error);

      // Mark as failed
      updateMessageStatus(chatId, tempId, 'failed');
      setMessages(prev =>
        prev.map(msg => (msg.id === tempId ? { ...msg, status: 'failed' as const } : msg))
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
      return;
    }

    try {
      deleteChat(chatId);
      router.push('/chats');
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (message: ChatMessage) => {
    // Compare wallet addresses (case insensitive)
    return message.senderAddress?.toLowerCase() === walletAddress?.toLowerCase();
  };

  if (!isMiniAppReady || !chat) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/chats')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{chat.chatName}</h1>
            <p className="text-xs text-gray-500">{chat.memberWallets.length} members</p>
          </div>
        </div>
        <button
          onClick={() => setShowInfoModal(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Info className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = isMyMessage(message);

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMine
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-sm'
                  }`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <div
                    className={`flex items-center gap-1 mt-1 text-xs ${
                      isMine ? 'text-blue-100 justify-end' : 'text-gray-500'
                    }`}
                  >
                    <span>{formatTimestamp(message.timestamp)}</span>
                    {isMine && (
                      <span>
                        {message.status === 'sending' && <Check className="h-3 w-3" />}
                        {message.status === 'sent' && <CheckCheck className="h-3 w-3" />}
                        {message.status === 'failed' && <span className="text-red-300">!</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Chat Info</h2>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Chat Name</h3>
                <p className="text-gray-900">{chat.chatName}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Members</h3>
                <p className="text-gray-900">{chat.memberWallets.length} members</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
                <p className="text-gray-900">
                  {new Date(chat.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <button
              onClick={handleDeleteChat}
              className="w-full bg-red-600 text-white font-medium py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="h-5 w-5" />
              Delete Chat
            </button>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-3 bg-gray-100 text-gray-900 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
