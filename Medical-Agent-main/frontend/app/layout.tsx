import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedCheck",
  description: "Analyze your hospital bills for errors and potential savings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <div className="relative min-h-screen overflow-hidden">
          <svg className="pointer-events-none absolute h-0 w-0">
            <defs>
              <filter id="grainy-page">
                <feTurbulence type="fractalNoise" baseFrequency="0.375" numOctaves="3" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
                <feComponentTransfer>
                  <feFuncA type="table" tableValues="0 0 1" />
                </feComponentTransfer>
              </filter>
            </defs>
          </svg>

          <div className="pointer-events-none absolute inset-0 bg-background" />
          <div
            className="pointer-events-none absolute inset-0 opacity-45 mix-blend-multiply"
            style={{ filter: "url(#grainy-page)" }}
          />

          <div className="relative min-h-screen">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
