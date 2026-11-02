import type { Metadata } from "next";
import "./globals.css";
import {PWAStatus} from "../components/pwa-status";

export const metadata: Metadata = {
  title: "Tupã Travel · El arte de descubrir el mundo",
  description: "Descubrí destinos y creá itinerarios a medida con una experiencia premium.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {capable:true,title:"Tupã Travel",statusBarStyle:"default"},
  icons: {
    icon: "/tupa-premium-emblem.svg",
    apple: "/tupa-premium-emblem.svg",
    shortcut: "/tupa-premium-emblem.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased"><PWAStatus/>{children}</body>
    </html>
  );
}
