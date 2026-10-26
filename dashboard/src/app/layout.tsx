import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex Filings Dashboard Preview",
  description: "Frontend preview of the Apex Filings admin and client dashboards.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.dashboardTheme=localStorage.getItem('apex-dashboard-theme')==='dark'?'dark':'light'}catch(e){}" }} />
        {children}
      </body>
    </html>
  );
}
