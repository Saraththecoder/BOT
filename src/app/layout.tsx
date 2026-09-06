import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1411" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://aitsbot.ai'),
  title: "aitsbot.ai — Official AITS Tirupati AI Campus Companion",
  description: "Ask questions about admissions, AP EAPCET cutoffs (Counseling Code: AITT), B.Tech & M.Tech courses, fee structures, and campus placements at AITS Tirupati.",
  keywords: [
    "AITS Tirupati", 
    "Annamacharya Institute of Technology and Sciences", 
    "EAPCET cutoffs 2025", 
    "AITT counseling code", 
    "AITS Admissions", 
    "AITS Placements",
    "Tirupati Engineering Colleges"
  ],
  authors: [{ name: "AITS Tirupati AI Team" }],
  creator: "aitsbot.ai",
  publisher: "aitsbot.ai",
  openGraph: {
    title: "aitsbot.ai — Official AITS Tirupati AI Campus Companion",
    description: "Instant voice & text answers for AP EAPCET cutoffs, admission procedures, fee structures, and campus life at AITS Tirupati.",
    url: "https://aitsbot.ai",
    siteName: "aitsbot.ai",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 800,
        alt: "aitsbot.ai Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "aitsbot.ai — Official AITS Tirupati AI Campus Companion",
    description: "Instant voice & text answers for AP EAPCET cutoffs, admission procedures, fee structures, and campus life at AITS Tirupati.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('aitsbot_theme');
                  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans select-none">{children}</body>
    </html>
  );
}
