import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource-variable/source-sans-3";
import "../../../../src/app/globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Workout Pal · Authenticated QA harness",
};

export default function HarnessRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="harness-banner" role="status">
          Local authenticated QA harness · synthetic data only
        </div>
        {children}
      </body>
    </html>
  );
}
