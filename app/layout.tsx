import type { Metadata, Viewport } from 'next'
import { Inter, Inter_Tight, Geist_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-tight',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'REPRA',
  description: 'Every rep becomes proof.',
  manifest: '/manifest.json',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [{ url: '/repra-app-icon.png', type: 'image/png' }],
    shortcut: '/repra-app-icon.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'REPRA',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#080808',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`h-full ${inter.variable} ${interTight.variable} ${geistMono.variable}`}>
      <head>
        {/* Blocking script: runs before CSS is applied, eliminates theme flash.
            Placed in <head> so it executes before any content renders. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('repra_theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}})();` }} />
      </head>
      <body className="h-full" style={{ background: 'var(--app-bg)', color: 'var(--text-primary)' }}>
        {children}
      </body>
    </html>
  )
}
