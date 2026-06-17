"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zalo-blue to-zalo-blue-dark p-6">
      <div className="w-full max-w-md animate-fade-in rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zalo-blue text-white shadow-lg">
            <MessageCircle size={34} strokeWidth={2.4} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Zalo Clone Chat</h1>
          <p className="mt-2 text-sm text-gray-500">
            Nhắn tin nhanh, mượt và bảo mật. Đăng nhập để bắt đầu trò chuyện.
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-zalo-blue" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? "Đang chuyển hướng..." : "Đăng nhập bằng Google"}
        </button>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          Bằng việc đăng nhập, bạn đồng ý cho ứng dụng lưu trữ tin nhắn của bạn
          để phục vụ trò chuyện.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
