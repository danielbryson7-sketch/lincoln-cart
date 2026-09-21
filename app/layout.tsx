import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lincoln Cart",
  description: "A shared shopping list with local Walmart search for Lincoln, Illinois.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
