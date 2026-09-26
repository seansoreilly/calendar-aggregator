import type { Metadata, Viewport } from 'next'
import { Archivo, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import '../styles/globals.css'
import GoogleAnalytics from '../components/google-analytics'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const title = 'Calendar Aggregator | One URL for all your calendars'
const description =
  'Combine several iCal feeds into a single subscription URL. Paste your .ics links, get one address any calendar app can subscribe to.'
const siteUrl = 'https://www.calendar-aggregator.online'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    url: siteUrl,
    siteName: 'Calendar Aggregator',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F2F4F3',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Calendar Aggregator',
  url: siteUrl,
  description,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
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

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <GoogleAnalytics />
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
