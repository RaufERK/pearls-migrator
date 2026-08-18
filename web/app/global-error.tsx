'use client';

import NextError from 'next/error';

export default function GlobalError({ error: _error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="ru">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
