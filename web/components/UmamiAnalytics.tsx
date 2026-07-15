import Script from 'next/script';

const UMAMI_WEBSITE_ID = 'c1905456-0569-4e4a-954d-3d4866e20139';
const UMAMI_SCRIPT_URL = 'https://analytics.amasters.ru/script.js';

export function UmamiAnalytics() {
  return (
    <Script
      defer
      src={UMAMI_SCRIPT_URL}
      data-website-id={UMAMI_WEBSITE_ID}
      strategy="afterInteractive"
    />
  );
}
