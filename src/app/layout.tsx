import type { Metadata } from "next";
import "./globals.css";
import { InteractionFeedback } from "@/components/interaction-feedback";

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
      <body className="min-h-full flex flex-col"><InteractionFeedback />{children}</body>
    </html>
  );
}
