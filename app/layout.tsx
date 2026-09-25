import type { Metadata, Viewport } from "next";
import { Geist, Calistoga } from "next/font/google";
import "./globals.css";
import NotificationSoundListener from "@/components/NotificationSoundListener";
import { ThemeProvider } from "@/components/ThemeProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const calistoga = Calistoga({
  variable: "--font-calistoga",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Social Coffé — Meet People at Your Coffee Shop",
  description: "Connect with people sharing your coffee moment.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // full-bleed PWA on iOS
    title: "Social Coffé",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",           // honour safe areas on notched iPhones
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7EEE1" },
    { media: "(prefers-color-scheme: dark)",  color: "#180E06" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geist.variable} ${calistoga.variable} h-full`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo-social.png" />
        {/* Anti-flash: restore accent before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var a=localStorage.getItem('accent');if(a&&a!=='kopi')document.documentElement.setAttribute('data-accent',a);})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NotificationSoundListener />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
