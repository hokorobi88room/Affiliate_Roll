import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "この世界はあなたの色になる｜感情に振り回されないための実践note",
  description: "誰かの一言や、まだ起きていない不安に一日を渡さないために。全5章・53,244文字の実践型note教材。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
