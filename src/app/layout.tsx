import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "淳手作 ERP",
  description: "淳手作手作食品 / 飲料門市 ERP 系統",
  icons: {
    icon: "/brand-icon.png",
    apple: "/brand-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
