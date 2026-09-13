import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
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
  title: {
    default: "Oyame Tiase Assembly",
    template: "%s · Oyame Tiase Assembly",
  },
  description:
    "Local assembly management system for The Church of Pentecost, Oyame Tiase Assembly.",
  icons: {
    icon: "/cop-emblem.png",
    apple: "/cop-emblem.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistSans.className} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground tracking-normal">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
