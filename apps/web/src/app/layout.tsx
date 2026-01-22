// apps/web/src/app/layout.tsx

import type { ReactNode } from "react";

export const metadata = {
  title: "TG Analytics",
  description: "Telegram chat analytics",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
