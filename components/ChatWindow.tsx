"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, MoreHorizontal, Phone, Video } from "lucide-react";
import Avatar from "./Avatar";
import MessageInput from "./MessageInput";
import type { Conversation, Message, Profile } from "@/lib/types";
import {
  cn,
  formatLastSeen,
  formatMessageTime,
  isOnline,
} from "@/lib/utils";

type ChatWindowProps = {
  me: Profile;
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  onSend: (text: string) => void;
  onBack: () => void;
};

export default function ChatWindow({
  me,
  conversation,
  messages,
  loading,
  sending,
  onSend,
  onBack,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Tự cuộn xuống cuối khi có tin nhắn mới / đổi cuộc trò chuyện.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, conversation?.id]);

  if (!conversation) {
    return (
      <section className="hidden flex-1 flex-col items-center justify-center chat-bg md:flex">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-zalo-blue shadow">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-700">
            Chào mừng đến Zalo Clone
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Chọn một cuộc trò chuyện để bắt đầu nhắn tin.
          </p>
        </div>
      </section>
    );
  }

  const name =
    conversation.other.full_name || conversation.other.email || "Người dùng";
  const online = isOnline(conversation.other.last_seen);

  return (
    <section className="flex h-full flex-1 flex-col">
      {/* Header cuộc trò chuyện */}
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-3 py-2.5 md:px-4">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 text-gray-600 transition hover:bg-gray-100 md:hidden"
        >
          <ArrowLeft size={22} />
        </button>
        <Avatar
          src={conversation.other.avatar_url}
          name={name}
          size={42}
          online={online}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{name}</p>
          <p className="truncate text-xs text-gray-400">
            {online ? "Đang hoạt động" : formatLastSeen(conversation.other.last_seen)}
          </p>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <button className="rounded-full p-2 transition hover:bg-gray-100 hover:text-zalo-blue">
            <Phone size={20} />
          </button>
          <button className="rounded-full p-2 transition hover:bg-gray-100 hover:text-zalo-blue">
            <Video size={20} />
          </button>
          <button className="rounded-full p-2 transition hover:bg-gray-100 hover:text-zalo-blue">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </header>

      {/* Danh sách tin nhắn */}
      <div className="scrollbar-thin chat-bg flex-1 overflow-y-auto px-3 py-4 md:px-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-300 border-t-zalo-blue" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
            Hãy gửi lời chào để bắt đầu cuộc trò chuyện 👋
          </div>
        ) : (
          <MessageGroups me={me} messages={messages} otherName={name} />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Ô nhập tin */}
      <MessageInput onSend={onSend} disabled={sending} />
    </section>
  );
}

// Hiển thị tin nhắn kèm phân tách theo ngày.
function MessageGroups({
  me,
  messages,
  otherName,
}: {
  me: Profile;
  messages: Message[];
  otherName: string;
}) {
  let lastDate = "";
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-0.5">
      {messages.map((m, i) => {
        const mine = m.sender_id === me.id;
        const dateLabel = new Date(m.created_at).toLocaleDateString("vi-VN");
        const showDate = dateLabel !== lastDate;
        lastDate = dateLabel;

        const prev = messages[i - 1];
        const grouped =
          prev &&
          prev.sender_id === m.sender_id &&
          new Date(m.created_at).getTime() -
            new Date(prev.created_at).getTime() <
            120_000 &&
          !showDate;

        return (
          <div key={m.id}>
            {showDate && (
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-black/10 px-3 py-1 text-xs text-gray-600">
                  {dateLabel}
                </span>
              </div>
            )}
            <div
              className={cn(
                "flex animate-fade-in",
                mine ? "justify-end" : "justify-start",
                grouped ? "mt-0.5" : "mt-2"
              )}
            >
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm md:max-w-[65%]",
                  mine
                    ? "rounded-br-md bg-zalo-bubble text-white"
                    : "rounded-bl-md bg-white text-gray-900"
                )}
                title={new Date(m.created_at).toLocaleString("vi-VN")}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p
                  className={cn(
                    "mt-1 text-right text-[10px]",
                    mine ? "text-white/70" : "text-gray-400"
                  )}
                >
                  {formatMessageTime(m.created_at)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
