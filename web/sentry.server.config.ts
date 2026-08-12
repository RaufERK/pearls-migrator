import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    'https://ac1e1a6f5414303dfbb3f2ed80c582e5@o4511896952242177.ingest.de.sentry.io/4511898081624144',

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below.
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  includeLocalVariables: true,

  enableLogs: true,
});
