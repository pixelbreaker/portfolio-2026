# Use TanStack Start with Netlify server-side deployment

The portfolio uses TanStack Start for its React application and Netlify's TanStack Start adapter for deployment. This preserves server-rendered document requests and future server routes/functions; a static SPA rewrite would be simpler but would give up those capabilities, so the application publishes client assets while routing runtime requests through Netlify serverless functions.
