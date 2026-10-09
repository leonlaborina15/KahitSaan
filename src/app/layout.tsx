import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KahitSaan",
  description: "Best budget fast-food meal near you, picked by on-device AI.",
};

export const viewport: Viewport = { themeColor: "#FFF8F1", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fil">
      <body className={jakarta.variable}>
        {children}
        <Toaster position="top-center" toastOptions={{ style: { borderRadius: 14, fontFamily: "var(--font-jakarta)" } }} />
      </body>
    </html>
  );
}
