'use client'

import Script from 'next/script'

declare global {
  interface Window {
    gtag: (
      command: string,
      ...args: (string | number | Date | Record<string, string | number>)[]
    ) => void
    dataLayer: unknown[]
  }
}

const GoogleAnalytics = ({
  nonce,
}: {
  nonce?: string | undefined
}): React.ReactElement => {
  const GA_MEASUREMENT_ID = 'G-ESZWBFZV7F'

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
      </Script>
    </>
  )
}

export default GoogleAnalytics
