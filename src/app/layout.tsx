import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisionDesk",
  description: "Дашборд для анализа видеопотока нейросетью в реальном времени",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}