"use client";

import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, TrendingUp, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === "/chats") {
      return pathname === "/chats" || pathname.startsWith("/chats/");
    }
    return pathname === path;
  };

  const navItems = [
    {
      label: "Chats",
      path: "/chats",
      icon: MessageCircle,
    },
    {
      label: "Bets",
      path: "/bets",
      icon: TrendingUp,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-2">
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-1 py-3 px-4 rounded-lg transition-all duration-200 ${
                active
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className={`${active ? "h-5 w-5" : "h-5 w-5"} transition-all`} />
              <span className={`text-xs font-medium ${active ? "text-blue-600" : "text-gray-600"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
