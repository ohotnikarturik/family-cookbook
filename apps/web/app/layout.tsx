import type { Metadata } from 'next';
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';
import { getMessages } from 'next-intl/server';

import { ThemeScript } from '@/components/theme/theme-script';

import { AppProviders } from './providers';

import './globals.css';

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Family Cookbook',
  description: 'Private family recipe library',
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const messages = await getMessages();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeScript />
        <AppProviders locale="en" messages={messages}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
