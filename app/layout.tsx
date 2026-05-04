import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const lora = Lora({subsets:['latin'],variable:'--font-serif'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  if (host.includes("willsleep.dev")) {
    return {
      title: "The Sleep Lab",
      description: "a space for dreaming",
    };
  }

  if (host.includes("yueqiao.dev")) {
    return {
      title: "Yueqiao Dev",
      description: "Coming soon",
    };
  }

  return {
    title: "My Site",
    description: "Welcome",
  };
}

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
