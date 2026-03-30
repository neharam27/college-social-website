import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import Chatbot from "@/components/Chatbot"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "CollegeSocial — Campus Hub",
  description: "Your college community hub – follow clubs, see events, chat with AI",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flicker: set theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className={inter.className} style={{ transition: "background-color 200ms, color 200ms" }}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              background: "var(--surface)",
              color: "var(--text-primary)",
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--border)",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
            },
          }}
        />
        {children}
        <Chatbot />
      </body>
    </html>
  )
}
