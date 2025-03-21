import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Noto_Color_Emoji } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

const pretendard = localFont({
  src: 'fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
});

const notoColorEmoji = Noto_Color_Emoji({
  subsets: ['emoji'],
  weight: ['400'],
  display: 'swap',
  preload: true,
  variable: '--font-noto-color-emoji',
  fallback: ['Pretendard Variable'],
});

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${pretendard.variable} ${notoColorEmoji.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
