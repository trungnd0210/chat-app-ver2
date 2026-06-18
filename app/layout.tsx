import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat",
  description: "Realtime chat app.",
  applicationName: "Chat",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Chat", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
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
    <html lang="en">
      <body className="bg-zalo-bg text-gray-900">{children}</body>
    </html>
  );
}
