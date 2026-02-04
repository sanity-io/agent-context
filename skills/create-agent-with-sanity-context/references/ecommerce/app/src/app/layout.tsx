import './globals.css'

import type {Metadata} from 'next'
import {Inter} from 'next/font/google'

import {ChatButton} from '@/components/chat'
import {Header} from '@/components/header'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Store | E-commerce Demo',
  description: 'A minimal e-commerce demo built with Next.js and Sanity',
}

// Test change (update)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Header />

        {children}

        <ChatButton />
      </body>
    </html>
  )
}
