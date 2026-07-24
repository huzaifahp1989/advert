# advert

AdvertApp — Islam Media Central community adverts, sponsors, events, and directory listings.

## Fix: invalid `window.open` URLs

Some listings or platform links can contain malformed URLs such as `https:/#`. Browsers throw when `window.open` receives these values, which previously crashed the app on startup in embedded/mobile shells.

This project now guards all `window.open` calls via:

- `index.html` bootstrap patch (runs before the React bundle)
- `src/utils/safeOpenUrl.ts` for future source migrations

Invalid URLs are ignored instead of crashing the app.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Environment

Set the same `VITE_FIREBASE_*` and `VITE_SUPABASE_*` variables used by the Vercel deployment when rebuilding from source.
