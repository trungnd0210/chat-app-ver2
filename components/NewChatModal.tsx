"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import Avatar from "./Avatar";
import type { Profile } from "@/lib/types";
import { isOnline } from "@/lib/utils";

type NewChatModalProps = {
  open: boolean;
  users: Profile[];
  loading: boolean;
  onClose: () => void;
  onSelectUser: (user: Profile) => void;
};

export default function NewChatModal({
  open,
  users,
  loading,
  onClose,
  onSelectUser,
}: NewChatModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.full_name || u.email || "").toLowerCase().includes(q)
    );
  }, [query, users]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md animate-fade-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Cuộc trò chuyện mới
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-3">
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email"
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Đang tải...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {query
                ? "Không tìm thấy người dùng phù hợp."
                : "Chưa có người dùng nào khác. Hãy mời bạn bè đăng nhập!"}
            </p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelectUser(u)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
              >
                <Avatar
                  src={u.avatar_url}
                  name={u.full_name}
                  size={44}
                  online={isOnline(u.last_seen)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {u.full_name || "Người dùng"}
                  </p>
                  <p className="truncate text-xs text-gray-400">{u.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
