import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { WorkerInitializer } from "@/components/WorkerInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Prevent font loading from blocking render
  preload: true, // Preload fonts for faster initial load
  fallback: ["system-ui", "arial"], // Fallback fonts while loading
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Prevent font loading from blocking render
  preload: true, // Preload fonts for faster initial load
  fallback: ["monospace"], // Fallback fonts while loading
});

export const metadata: Metadata = {
  title: "Urvann Growth Automation",
  description: "Growth automation platform for Urvann",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WorkerInitializer />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
