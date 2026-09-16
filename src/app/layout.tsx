import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/src/components/Navbar";
import { FloatingAiAssistant } from "@/src/components/FloatingAiAssistant";
import { CosmicBackground } from "@/src/components/CosmicBackground";
import { Footer } from "@/src/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cosmic Event & Stargazer Hub",
  description:
    "Next-generation astronomical portal with dark sky mapping, live satellite tracking, optical FOV simulator, community star parties, and AI astrophotography tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col text-slate-100 font-sans selection:bg-sky-500 selection:text-white relative">
        {/* Dynamic High-Performance Cosmic Background */}
        <CosmicBackground />

        {/* Global Navbar */}
        <Navbar />

        {/* Main Content Container */}
        <main className="flex-1 min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
          {children}
        </main>

        {/* Global Footer */}
        <Footer />

        {/* Global Floating AI Assistant */}
        <FloatingAiAssistant />
      </body>
    </html>
  );
}
