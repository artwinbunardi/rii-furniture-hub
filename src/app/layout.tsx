import type { Metadata } from "next";
import "./globals.css";
import "./site.css";
import { getLang } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: { default: "RII Furniture Hub", template: "%s · RII Furniture Hub" },
  description: "RII Furniture Collection & Reservation System",
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
