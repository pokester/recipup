import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
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
  title: {
    default: "Recipup — Personalised Home-Cooked Dog Food Recipes",
    template: "%s | Recipup",
  },
  description:
    "Build personalised recipes for your dog based on breed, age, weight, and health conditions. You cook with real ingredients. We handle the nutrition science.",
  openGraph: {
    title: "Recipup — Personalised Home-Cooked Dog Food Recipes",
    description:
      "Build personalised recipes for your dog based on breed, age, weight, and health conditions. You cook with real ingredients. We handle the nutrition science.",
    type: "website",
    siteName: "Recipup",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recipup — Personalised Home-Cooked Dog Food Recipes",
    description:
      "Build personalised recipes for your dog based on breed, age, weight, and health conditions. You cook with real ingredients. We handle the nutrition science.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full">
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  );
}
