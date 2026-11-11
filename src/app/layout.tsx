import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import "./globals.css";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "MiniPM — Mini Project Manager",
  description: "Plan projects, track tasks and ship on time.",
};

export const viewport: Viewport = { themeColor: "#0c66e4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
