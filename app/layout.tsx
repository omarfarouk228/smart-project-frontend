import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { OrgThemeProvider } from "@/components/providers/OrgThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProjectEyes",
  description: "Gestion de projets intelligente",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <QueryProvider>
          <OrgThemeProvider>
            {children}
            <Toaster richColors position="top-right" />
          </OrgThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
