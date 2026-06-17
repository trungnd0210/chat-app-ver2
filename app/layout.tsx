import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zalo Clone — Chat",
  description: "Ứng dụng chat 1-1 realtime, đăng nhập bằng Google.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0068FF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-zalo-bg text-gray-900">{children}</body>
    </html>
  );
}
