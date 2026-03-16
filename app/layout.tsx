import type { Metadata } from "next";
import "@/styles/globals.scss";
import styles from "./layout.module.scss";

export const metadata: Metadata = {
  title: "My Record Collection",
  description: "Online record collection powered by Discogs API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={styles.body}>
        {children}
      </body>
    </html>
  );
}
