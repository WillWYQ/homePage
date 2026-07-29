import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteName, SITE_URL } from "@/lib/site";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...(METADATA_MAP[siteName] || METADATA_MAP.willsleep),
};

// 暗色 theme-color:手机浏览器地址栏融入黑底(§DESIGN 10.5)
export const viewport: Viewport = {
  themeColor: "#000000",
};

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
      <body className="min-h-full flex flex-col">
        {children}
        {/* 全站 grain 底噪(§DESIGN 10.3):静态、≤5%,访客不该注意到它 */}
        <div aria-hidden="true" className="grain-overlay" />
      </body>
    </html>
  );
}
