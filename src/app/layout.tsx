import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mahadum — Learn from people who do the work",
  description: "Practical courses from Africa's most ambitious creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
