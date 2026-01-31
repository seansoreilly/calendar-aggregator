import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import '../styles/globals.css'
import GoogleAnalytics from '../components/google-analytics'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
})

export const metadata: Metadata = {
  title: 'Calendar Aggregator | GUID-based Calendar Collection Service',
  description:
    'Seamlessly combine multiple iCal feeds into unified calendar collections with custom IDs. Built with Next.js 15, TypeScript, and glassmorphism UI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans flex flex-col min-h-screen bg-[#030712] text-white selection:bg-purple-500/30`}
      >
        {/* Advanced Mesh Gradient Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/30 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-blue-900/20 blur-[100px] rounded-full animation-delay-2000"></div>
          <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-indigo-900/20 blur-[80px] rounded-full animation-delay-4000"></div>
          <div className="absolute inset-0 bg-[url('/bg-noise.png')] opacity-15 brightness-100 contrast-125 mix-blend-overlay"></div>
        </div>

        <GoogleAnalytics />
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
