import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { UmamiAnalytics } from '../components/UmamiAnalytics';
import { YandexMetrika } from '../components/YandexMetrika';
import './globals.css';

export const metadata: Metadata = {
  title: 'Жемчужины Мудрости',
  description: 'Библиотека текстов Жемчужины Мудрости для чтения онлайн и скачивания.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <UmamiAnalytics />
        <Suspense fallback={null}>
          <YandexMetrika />
        </Suspense>
      </body>
    </html>
  );
}
