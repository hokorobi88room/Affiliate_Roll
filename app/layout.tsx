import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "この世界はあなたの世界になる｜東洋思想から学ぶ人生の整え方",
  description: "老荘思想・禅・仏教の知恵を、仕事・人間関係・暮らしに生かす実践型note教材。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
