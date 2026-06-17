"use client";

import { useMemo, useState } from "react";
import { Search, SquarePen, Bell, BellOff, LogOut } from "lucide-react";
import Avatar from "./Avatar";
import type { Conversation, Profile } from "@/lib/types";
import {
  cn,
  formatConversationTime,
  isOnline,
} from "@/lib/utils";

type SidebarProps = {
  me: Profile;
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  notifPermission: string;
  onEnableNotifications: () => void;
  onSelect: (conv: Conversation) => void;
  onNewChat: () => void;
  onSignOut: () => void;
};

export default function Sidebar({
  me,
  conversations,
  activeId,
  loading,
  notifPermission,
  onEnableNotifications,
  onSelect,
  onNewChat,
  onSignOut,
}: SidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      (c.other.full_name || c.other.email || "")
        .toLowerCase()
        .includes(q)
    );
  }, [query, conversations]);

  return (
    <aside className="flex h-full w-full flex-col bg-white md:w-[340px] md:border-r md:border-gray-200">
      {/* Header: avatar của tôi + nút tạo cuộc trò chuyện */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar src={me.avatar_url} name={me.full_name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">
            {me.full_name || me.email}
          </p>
          <p className="truncate text-xs text-gray-400">Đang trực tuyến</p>
        </div>
        {notifPermission !== "granted" && notifPermission !== "unsupported" && (
          <button
            onClick={onEnableNotifications}
            title="Bật thông báo"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-zalo-blue"
          >
            {notifPermission === "denied" ? (
              <BellOff size={20} />
            ) : (
              <Bell size={20} />
            )}
          </button>
        )}
        <button
          onClick={onNewChat}
          title="Cuộc trò chuyện mới"
          className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 hover:text-zalo-blue"
        >
          <SquarePen size={20} />
        </button>
        {/* Đăng xuất — chỉ hiện trên mobile (desktop đã có ở thanh dọc) */}
        <button
          onClick={onSignOut}
          title="Đăng xuất"
          className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 hover:text-red-500 md:hidden"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Ô tìm kiếm */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
          <Search size={18} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm"
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Danh sách hội thoại */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {loading ? (
          <SidebarSkeleton />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            {query
              ? "Không tìm thấy cuộc trò chuyện."
              : "Chưa có cuộc trò chuyện nào. Nhấn ✎ để bắt đầu."}
          </div>
        ) : (
          filtered.map((c) => {
            const active = c.id === activeId;
            const name = c.other.full_name || c.other.email || "Người dùng";
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                  active ? "bg-zalo-blue-light" : "hover:bg-gray-50"
                )}
              >
                <Avatar
                  src={c.other.avatar_url}
                  name={name}
                  size={48}
                  online={isOnline(c.other.last_seen)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-gray-900">{name}</p>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {formatConversationTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-sm",
                        c.unread > 0
                          ? "font-semibold text-gray-800"
                          : "text-gray-500"
                      )}
                    >
                      {c.last_message || "Bắt đầu trò chuyện"}
                    </p>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
