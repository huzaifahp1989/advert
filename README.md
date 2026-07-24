# advert

Islam Media Central advertising app (AdvertApp).

## Invalid URL fix

Mobile WebViews were crashing when ad/sponsor links used placeholders like `#` or `https://#` with `target="_blank"` / `window.open`. Chromium reports that as `https:/#`, throws a `SyntaxError`, and the root error boundary replaced the whole app with “App failed to load”.

This repo guards external navigation in three places:

1. `url-guard.js` runs before the React bundle, blocks invalid `window.open` calls and blank-target clicks, and swallows residual invalid-open errors.
2. `scripts/patch-bundle.mjs` patches the deployed bundle so ad opens go through `__resolveExternalUrl`, and soft-fails the root error boundary for invalid-open errors.
3. `src/utils/externalUrl.js` is the shared helper for future source builds.

Also sanitize listing data so empty destinations are stored as `#` (or a real URL), never `https://#`.

## Deploy to Vercel

The live app at `traeadvert8pia.vercel.app` must be connected to this repository:

1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the `traeadvert8pia` project (or import `huzaifahp1989/advert`)
3. Set **Root Directory** to `.` and leave **Build Command** empty (static site)
4. Deploy from the `main` branch

After deploy, confirm `index.html` includes:

```html
<script src="/url-guard.js"></script>
```

If you rebuild the JS bundle from source, run `npm run patch` before deploying.
