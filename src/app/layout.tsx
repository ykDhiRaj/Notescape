import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import 'katex/dist/katex.min.css';
import {dark} from "@clerk/themes";


export const metadata: Metadata = {
  title: "Notescape – Smart Notes & Canvas App",
  description:
    "Notescape is a modern, AI-powered canvas and note-taking app. Draw, write, collaborate, and export your ideas effortlessly.",
  keywords: [
    "Notescape",
    "notes app",
    "canvas notebook",
    "collaborative notes",
    "drawing app",
    "fabric.js",
    "AI notes",
    "PDF export",
    "markdown notes",
  ],
  authors: [{ name: "Notescape Team" }],
  creator: "Notescape",
  publisher: "Notescape",
  themeColor: "#171717",
  openGraph: {
    title: "Notescape – Your Ideas, Organized",
    description:
      "Take notes, sketch on a canvas, collaborate, and export to PDF. All in one powerful app.", 
    siteName: "Notescape",
    images: [
      {
        url: "/og-image.png", 
        width: 1200,
        height: 630,
        alt: "Notescape App Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Notescape – Smart Notes & Canvas App",
    description:
      "Sketch, take notes, and collaborate in a modern canvas app with PDF export and AI tools.",
    images: ["/og-image.png"],
    creator: "@JdhirajDev", 
  },
  category: "productivity",
  manifest: "/manifest.json", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
    appearance={{
        baseTheme: dark,
      }}
     signInUrl="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">
    <html lang="en">
      <body
        cz-shortcut-listen="true"
        className={`${GeistSans.variable} ${GeistMono.variable}`}
      >
        {children}
      </body>
    </html>
    </ClerkProvider>
    
  );
}
