import React from 'react';
import { Providers } from '../components/Providers';
import '../styles/variables.css';
import '../styles/style.css';
import '../styles/components.css';
import '../styles/responsive.css';

export const metadata = {
  title: 'EasyFr8 Admin Console',
  description: 'EasyFr8 Admin Panel - Modern digital freight rates procurement and CMS configuration portal.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
