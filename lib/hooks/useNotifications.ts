"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

// Hook quản lý thông báo trình duyệt + âm thanh báo tin nhắn mới.
// Dùng Service Worker để hiển thị thông báo (chạy được cả trên Android).
export function useNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);

    // Đăng ký service worker (cần cho thông báo trên Android & Web Push).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          swRegRef.current = reg;
        })
        .catch(() => {});
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
  }, []);

  // Tiếng "ting" ngắn tạo bằng Web Audio API (không cần file âm thanh).
  const playSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Bỏ qua nếu trình duyệt chặn âm thanh.
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string, options?: { icon?: string; tag?: string }) => {
      playSound();

      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted" ||
        document.visibilityState === "visible"
      ) {
        // Khi tab đang ở foreground thì không bắn thông báo hệ thống (đã có âm
        // thanh + badge trong app), tránh làm phiền.
        return;
      }

      const opts: NotificationOptions = {
        body,
        icon: options?.icon,
        tag: options?.tag,
      };

      try {
        // Ưu tiên service worker (hoạt động cả trên Android).
        if (swRegRef.current) {
          swRegRef.current.showNotification(title, opts);
        } else if (navigator.serviceWorker?.ready) {
          navigator.serviceWorker.ready.then((reg) =>
            reg.showNotification(title, opts)
          );
        } else {
          const n = new Notification(title, opts);
          n.onclick = () => {
            window.focus();
            n.close();
          };
        }
      } catch {
        // Bỏ qua lỗi tạo notification.
      }
    },
    [playSound]
  );

  return { permission, requestPermission, notify, playSound };
}
