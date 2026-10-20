import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Activity Tracker",
  description: "Simple & Mobile-Friendly Activity Tracker Management",
  icons: {
    icon: [
      { url: "/logo-icon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon-v1.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    shortcut: "/favicon-v1.png?v=2",
    apple: "/favicon-v1.png?v=2",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
