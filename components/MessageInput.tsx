"use client";

import { useRef, useState } from "react";
import { Send, Smile } from "lucide-react";

type MessageInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

const EMOJIS = ["😀", "😂", "😍", "👍", "❤️", "🎉", "😢", "🙏", "🔥", "😮"];

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    // Reset chiều cao ô nhập
    if (inputRef.current) inputRef.current.style.height = "auto";
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  return (
    <div className="relative border-t border-gray-200 bg-white px-3 py-2.5">
      {showEmoji && (
        <div className="absolute bottom-full left-3 mb-2 flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => {
                setText((t) => t + e);
                inputRef.current?.focus();
              }}
              className="rounded-lg p-1.5 text-xl transition hover:bg-gray-100"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="flex-shrink-0 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-zalo-blue"
          title="Emoji"
        >
          <Smile size={22} />
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type a message..."
          className="scrollbar-thin max-h-[140px] flex-1 resize-none rounded-2xl bg-gray-100 px-4 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-zalo-blue/40 disabled:opacity-60"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="flex-shrink-0 rounded-full bg-zalo-blue p-2.5 text-white transition hover:bg-zalo-blue-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          title="Send"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
