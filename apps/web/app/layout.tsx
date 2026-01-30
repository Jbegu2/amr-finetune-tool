import "./globals.css";
import { PortalNav } from "../components/PortalNav";

export const metadata = {
  title: "JBB Tool Portal",
  description: "A collection of utility tools for AMR workflows",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <PortalNav />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
