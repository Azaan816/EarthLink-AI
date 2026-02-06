import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MapChatProvider } from "@/context/MapChatContext";
import { TamboAIProvider } from "@/providers/TamboProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EarthLink AI - Agentic GIS",
  description: "Democratizing geospatial analysis with AI",
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
        <MapChatProvider>
          <TamboAIProvider>
            {children}
          </TamboAIProvider>
        </MapChatProvider>
      </body>
    </html>
  );
}

