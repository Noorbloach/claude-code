import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ryiys Hacker Claude Unlimited — Premium AI Workspace",
  description: "Access and compare dozens of frontier AI models (Claude 3.5, GPT-4o, DeepSeek V3) side-by-side. Secure, client-side encryption with 100% local storage.",
  keywords: ["AI Chatbot", "Ryiys Hacker Claude Unlimited", "Claude 3.5", "GPT-4o", "DeepSeek V3", "Model Comparison", "Developer Tools"],
  authors: [{ name: "Ryiys Hacker Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
