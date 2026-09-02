import type { Metadata, Viewport } from 'next'
import { Archivo, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import '../styles/globals.css'
import GoogleAnalytics from '../components/google-analytics'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-display',
})
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-body' })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const title = 'Calendar Aggregator | One URL for all your calendars'
const description =
  'Combine several iCal feeds into a single subscription URL. Paste your .ics links, get one address any calendar app can subscribe to.'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.calendar-aggregator.online'),
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
  },
  twitter: {
    title,
    description,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F2F4F3',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${interTight.variable} ${jetbrainsMono.variable} font-sans flex flex-col min-h-screen bg-paper text-ink antialiased selection:bg-today/20`}
      >
        {/* Ruled ground: the schedule grid the page is set on. */}
        <div className="fixed inset-0 -z-10 pointer-events-none bg-ruled" />

        <GoogleAnalytics />
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
