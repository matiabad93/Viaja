import type { Metadata } from "next";
import "./globals.css";
import {PWAStatus} from "../components/pwa-status";
import {ThemeProvider} from "../components/theme/theme-provider";

export const metadata: Metadata = {
  title: "Viaja · Tu viaje, investigado",
  description: "Planificá escapadas con fuentes, presupuesto y recomendaciones.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {capable:true,title:"Viaja",statusBarStyle:"default"},
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased"><ThemeProvider><PWAStatus/>{children}</ThemeProvider></body>
    </html>
  );
}
