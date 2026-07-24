# advert

Islam Media Central advertising app (AdvertApp).

## Invalid URL fix

Mobile WebViews were crashing on startup when sponsor/logo links used `href="#"` together with `target="_blank"`. Browsers resolve that to an invalid URL like `https://#`, which makes `window.open` throw and trips the app's error boundary.

This repo now guards external navigation in two places:

1. `url-guard.js` runs before the React bundle and blocks invalid `window.open` calls and blank-target clicks.
2. `scripts/patch-bundle.mjs` patches the deployed bundle so link opens go through `__resolveExternalUrl`.

For future source builds, use `src/utils/externalUrl.js` anywhere a link may be `#` or empty.

## Deploy

Static files in this repo are ready for Vercel. After changing the bundle, run:

```bash
node scripts/patch-bundle.mjs
```
