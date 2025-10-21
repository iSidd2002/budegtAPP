import type { Metadata } from 'next';
import './globals.css';
import ThemeProvider from './components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Budget App - Mobile-First Budgeting',
  description: 'Secure, mobile-first budgeting application with expense tracking and analytics',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 transition-colors">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

