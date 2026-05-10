import type { Metadata } from "next";
<<<<<<< ours
<<<<<<< ours
import { Playfair_Display, DM_Sans } from "next/font/google";
=======
import { DM_Sans, Playfair_Display } from "next/font/google";
>>>>>>> theirs
=======
import { DM_Sans, Playfair_Display } from "next/font/google";
>>>>>>> theirs
import "./globals.css";
import { SiteLayout } from "@/components/layout/site-layout";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Recipup",
  description: "Personalised dog food recipe generator",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  );
}
