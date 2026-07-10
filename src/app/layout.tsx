import type { Metadata } from "next";
import { Geist, Shippori_Mincho } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const shippori = Shippori_Mincho({
  variable: "--font-mincho",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Svayam Tracker",
  description: "アーユルヴェーダ×科学 体重管理実験トラッカー",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Svayam" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geist.variable} ${shippori.variable} h-full`}>
      <body className="min-h-full bg-stone-50 text-stone-900 font-sans">
        {children}
      </body>
    </html>
  );
}
