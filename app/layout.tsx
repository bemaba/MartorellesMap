import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MartorellesMap",
  description: "Planifica viajes multimodales combinando coche, tren y caminar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}