import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProductZero — 把模糊想法整理成有证据的 Product Brief",
  description: "AI 产品发现工作台：用 8 轮单问访谈问清真实经历，核对原话后生成带证据来源的 Product Brief。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
