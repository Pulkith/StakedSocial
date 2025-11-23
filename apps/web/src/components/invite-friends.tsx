"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Check } from "lucide-react";
import type { Signer, Identifier } from '@xmtp/browser-sdk';
import { Client } from '@xmtp/browser-sdk';
// import { hexToBytes } from "@noble/hashes/utils";
import { sdk } from "@farcaster/frame-sdk";
import { useAccount, useConnect } from "wagmi";
import { useSignMessage } from "wagmi";
interface Friend {
  fid: number;
  fid_str: string;
  display_name: string;
  username: string;
  pfp: string;
  wallet_address: string;
}

// Mock data for friends
// const MOCK_FRIENDS: Friend[] = [
//   {
//     id: "1",
//     name: "Alice Johnson",
//     username: "@alice",
//     walletAddress: "0x1234567890123456789012345678901234567890",
//     pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
//   },
//   {
//     id: "2",
//     name: "Bob Smith",
//     username: "@bob",
//     walletAddress: "0x0987654321098765432109876543210987654321",
//     pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
//   },
//   {
//     id: "3",
//     name: "Charlie Brown",
//     username: "@charlie",
//     walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
//     pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
//   },
//   {
//     id: "4",
//     name: "Diana Prince",
//     username: "@diana",
//     walletAddress: "0xfedcbafedcbafedcbafedcbafedcbafedcbafe",
//     pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana",
//   },
//   {
//     id: "5",
//     name: "Eve Wilson",
//     username: "@eve",
//     walletAddress: "0x1111111111111111111111111111111111111111",
//     pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve",
//   },
//   {
//     id: "6",
//     name: "Frank Miller",
//     username: "@frank",
//     walletAddress: "0x2222222222222222222222222222222222222222",
//     pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Frank",
//   },
// ];


export function InviteFriends({ username, context }: { username: string, context: any }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [user, setUser] = useState<Friend | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const { address, isConnected, isConnecting } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Function to fetch real friends data (to be implemented)
  async function fetchFriendsData(username: string): Promise<[Friend, Friend[]]> {

    // TODO: Replace with actual API call
    // const response = await fetch('/api/friends');
    // return response.json();

    // For now, return mock data
    const user_data = await fetch(`https://maia-api.ngrok-free.dev/user?username=${username}`);
    const user_data_json = await user_data.json();
    const fid = user_data_json.fid;
    const friends_data = await fetch(`https://maia-api.ngrok-free.dev/friends?fid=${fid}`);
    const friends_data_json = await friends_data.json();
    const res = friends_data_json.friends;
    console.log(res);
    return [user_data_json, res];
  }

  async function getClient(_address: string, signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>) {
    const hexToBytes = (hex: string) => {
      hex = hex.startsWith("0x") ? hex.slice(2) : hex;
      return new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    };
    // console.log("Signing wallet:", address);
    // console.log("Sign message async:", _address);

    // _address = "0xE627CEb73a02d39CeD519c496Bf8C81fe6317005";
  
    const signer: Signer = {
      type: "EOA",
      getIdentifier: () => ({
        identifier: _address as `0x${string}`,
        identifierKind: "Ethereum",
      }),
      signMessage: async (message) => {
        const msg = typeof message === "string" ? message : new TextDecoder().decode(message);
        const sigHex = await signMessageAsync({ message: msg });
        console.log("Signature (hex):", msg, sigHex);
        return hexToBytes(sigHex);
      },
    };
  
    const client = await Client.create(signer, { env: "dev" });
    return client;
  }


  // Function to create chat (to be implemented)
  async function createChat(user: Friend | null, selectedFriendIds: string[], context: any): Promise<void> {
    // TODO: Replace with actual API call
    console.log("Creating chat with friends:", selectedFriendIds);

    const user_wallet_address = user?.wallet_address;

    if (!user_wallet_address) {
      throw new Error("User not ready to chat");
    }
    // const other_address = "0x7a19e4496bf4428eb414cf7ad4a80dfe53b2a965";
    const client = await getClient(user_wallet_address, signMessageAsync);
    console.log("CLIENT", client);
    console.log("ID", client.inboxId);



    // Simulate API call - replace with actual fetch
    await new Promise(resolve => setTimeout(resolve, 2000));

    // const response = await fetch('/api/chat/create', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ friendIds: selectedFriendIds }),
    // });
    // return response.json();
  }

  // Load friends data
  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const [user_data, friends_data] = await fetchFriendsData(username);
        setUser(user_data);
        setFriends(friends_data);
      } catch (error) {
        console.error("Failed to load friends:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFriends();
  }, []);

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;

    const query = searchQuery.toLowerCase();
    return friends.filter(
      (friend) =>
        friend.display_name.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query) ||
        friend.fid_str.includes(query)
    );
  }, [friends, searchQuery]);

  // Toggle friend selection
  const toggleFriendSelection = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  // Format wallet address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatfid = (fid: string) => {
    return `ID: ${fid}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-24 pb-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Invite Friends</h1>
          <p className="text-gray-600">
            Select friends to start a chat and place bets
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, username, or wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Selected Friends Count */}
        {selectedFriends.size > 0 && (
          <div className="mb-6 p-4 bg-blue-100 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              {selectedFriends.size} friend{selectedFriends.size !== 1 ? "s" : ""} selected
            </p>
          </div>
        )}

        {/* Friends List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {friends.length === 0
                  ? "No friends found"
                  : "No friends match your search"}
              </p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div
                key={friend.fid}
                onClick={() => toggleFriendSelection(friend.fid_str)}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedFriends.has(friend.fid_str)
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Profile Picture */}
                <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                  {friend.pfp ? (
                    <img
                      src={friend.pfp}
                      alt={friend.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                      {friend.display_name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Friend Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {friend.display_name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {friend.username}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {/* {formatfid(friend.fid.toString())} */}
                    {formatAddress(friend.wallet_address)}
                  </p>
                </div>

                {/* Selection Checkbox */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    selectedFriends.has(friend.fid_str)
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {selectedFriends.has(friend.fid_str) && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        {filteredFriends.length > 0 && (
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setSelectedFriends(new Set())}
              disabled={isCreatingChat}
              className="flex-1 px-6 py-3 bg-white text-gray-900 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={async () => {
                if (selectedFriends.size > 0) {
                  setIsCreatingChat(true);
                  try {
                    const selectedFriendsArray = Array.from(selectedFriends);
                    await createChat(user, selectedFriendsArray, context);
                  } catch (error) {
                    console.error("Failed to create chat:", error);
                  } finally {
                    setIsCreatingChat(false);
                  }
                }
              }}
              disabled={selectedFriends.size === 0 || isCreatingChat}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Start Chat ({selectedFriends.size})
            </button>
          </div>
        )}
      </div>

      {/* Creating Chat Modal */}
      {isCreatingChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-12 flex flex-col items-center gap-6">
            {/* Spinner */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 opacity-20"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">Creating Chat</p>
              <p className="text-sm text-gray-500 mt-1">Setting up your conversation...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
