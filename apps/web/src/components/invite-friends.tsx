"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Check } from "lucide-react";

interface Friend {
  id: string;
  name: string;
  username: string;
  walletAddress: string;
  pfpUrl?: string;
}

// Mock data for friends
const MOCK_FRIENDS: Friend[] = [
  {
    id: "1",
    name: "Alice Johnson",
    username: "@alice",
    walletAddress: "0x1234567890123456789012345678901234567890",
    pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
  },
  {
    id: "2",
    name: "Bob Smith",
    username: "@bob",
    walletAddress: "0x0987654321098765432109876543210987654321",
    pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
  },
  {
    id: "3",
    name: "Charlie Brown",
    username: "@charlie",
    walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
  },
  {
    id: "4",
    name: "Diana Prince",
    username: "@diana",
    walletAddress: "0xfedcbafedcbafedcbafedcbafedcbafedcbafe",
    pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana",
  },
  {
    id: "5",
    name: "Eve Wilson",
    username: "@eve",
    walletAddress: "0x1111111111111111111111111111111111111111",
    pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve",
  },
  {
    id: "6",
    name: "Frank Miller",
    username: "@frank",
    walletAddress: "0x2222222222222222222222222222222222222222",
    pfpUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Frank",
  },
];

// Function to fetch real friends data (to be implemented)
async function fetchFriendsData(): Promise<Friend[]> {
  // TODO: Replace with actual API call
  // const response = await fetch('/api/friends');
  // return response.json();

  // For now, return mock data
  return MOCK_FRIENDS;
}

export function InviteFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load friends data
  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const data = await fetchFriendsData();
        setFriends(data);
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
        friend.name.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query) ||
        friend.walletAddress.toLowerCase().includes(query)
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
                key={friend.id}
                onClick={() => toggleFriendSelection(friend.id)}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedFriends.has(friend.id)
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Profile Picture */}
                <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                  {friend.pfpUrl ? (
                    <img
                      src={friend.pfpUrl}
                      alt={friend.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                      {friend.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Friend Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {friend.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {friend.username}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {formatAddress(friend.walletAddress)}
                  </p>
                </div>

                {/* Selection Checkbox */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    selectedFriends.has(friend.id)
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {selectedFriends.has(friend.id) && (
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
              className="flex-1 px-6 py-3 bg-white text-gray-900 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={() => {
                if (selectedFriends.size > 0) {
                  console.log(
                    "Inviting friends:",
                    Array.from(selectedFriends).map(
                      (id) => friends.find((f) => f.id === id)?.name
                    )
                  );
                  // TODO: Handle invite action
                }
              }}
              disabled={selectedFriends.size === 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Start Chat ({selectedFriends.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
