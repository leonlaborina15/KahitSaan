import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { AppDataProvider } from "@/components/app-data";
import { GlobalSheets } from "@/components/food";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KahitSaan",
  description: "Best budget fast-food meal near you, picked by on-device AI.",
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "KahitSaan", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#FFF8F1", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fil">
      <body className={geist.variable}>
        <AppDataProvider>
          {children}
          <GlobalSheets />
        </AppDataProvider>
        <SwRegister />
        <Toaster position="top-center" toastOptions={{ style: { borderRadius: 10, fontFamily: "var(--font-geist)" } }} />
      </body>
    </html>
  );
}
