"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import Avatar from "./Avatar";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type ProfileModalProps = {
  open: boolean;
  me: Profile;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
};

export default function ProfileModal({
  open,
  me,
  onClose,
  onSaved,
}: ProfileModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(me.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(me.full_name ?? "");
      setAvatarUrl(me.avatar_url ?? "");
      setError(null);
    }
  }, [open, me]);

  if (!open) return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large (max 5 MB).");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${me.id}/avatar_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch {
      setError(
        "Upload failed. Make sure the 'avatars' storage bucket exists (run supabase/storage.sql), or paste an image URL below instead."
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const updates = {
      full_name: name.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    };
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", me.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved(data as Profile);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit profile</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5">
          {/* Avatar + nút đổi ảnh */}
          <div className="mb-5 flex flex-col items-center">
            <div className="relative">
              <Avatar src={avatarUrl} name={name} size={96} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Change photo"
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-zalo-blue text-white shadow-md transition hover:bg-zalo-blue-dark disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Camera size={18} />
                )}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
            {avatarUrl ? (
              <button
                onClick={() => setAvatarUrl("")}
                className="mt-2 text-xs font-medium text-red-500 transition hover:underline"
              >
                Remove photo (use letter avatar)
              </button>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                Using letter avatar from your name
              </p>
            )}
          </div>

          {/* Tên hiển thị */}
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Display name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            className="mb-4 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-zalo-blue focus:ring-2 focus:ring-zalo-blue/30"
          />

          {/* Avatar bằng URL (tùy chọn) */}
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Or paste an image URL
          </label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-zalo-blue focus:ring-2 focus:ring-zalo-blue/30"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex items-center gap-2 rounded-xl bg-zalo-blue px-5 py-2 text-sm font-medium text-white transition hover:bg-zalo-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
