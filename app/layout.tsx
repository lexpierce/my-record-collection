import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.scss";
import styles from "./layout.module.scss";

/**
 * Inter font configuration
 * Using Inter as the default font with Latin subset
 */
const interFont = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Metadata for the application
 * Defines the title and description shown in browser tabs and search results
 */
export const metadata: Metadata = {
  title: "My Record Collection",
  description: "Online record collection powered by Discogs API",
};

/**
 * Root layout component for the entire application
 * Applies the Inter font and warm color theme to all pages
 *
 * @param children - The page content to render inside the layout
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={interFont.variable}>
      <body className={styles.body}>
        {children}
      </body>
    </html>
  );
}
