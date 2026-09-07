import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import FloatingVisitBadge from "@/components/common/FloatingVisitBadge";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SMH - Student MindX Hub",
  description: "Student MindX Hub - Learning platform for students",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} transition-colors duration-300 antialiased`}>
        <ThemeProvider>
          <FloatingVisitBadge />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}