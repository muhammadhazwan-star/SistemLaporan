import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Al Amin Edu Oasis — Sistem Penjanaan Laporan Kursus",
  description:
    "Sistem LMS Al Amin Edu Oasis: Penjanaan Laporan Kursus Latihan Berbantukan AI. Tampal maklumat kursus, AI jana laporan profesional dalam format PDF.",
  keywords: [
    "Al Amin Edu Oasis",
    "LMS",
    "Laporan Kursus",
    "AI",
    "Latihan Guru",
    "Pembangunan Staf",
  ],
  authors: [{ name: "Al Amin Edu Oasis Sdn Bhd" }],
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
