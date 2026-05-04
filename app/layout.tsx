import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const lora = Lora({subsets:['latin'],variable:'--font-serif'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const METADATA_MAP: Record<string, Metadata> = {
  willsleep: {
    title: "The Sleep Lab",
    description: "a space for dreaming",
  },
  yueqiao: {
    title: "Yueqiao Dev",
    description: "Coming soon",
  },
};

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "willsleep";
export const metadata: Metadata = METADATA_MAP[siteName] || METADATA_MAP.willsleep;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-serif", lora.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
