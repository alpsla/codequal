import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BillingProvider } from '../contexts/billing-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CodeQual',
  description: 'Code quality analysis platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BillingProvider>
          {children}
        </BillingProvider>
      </body>
    </html>
  )
}