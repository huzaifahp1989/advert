# advert

Islam Media Central advertising app (AdvertApp).

## Invalid URL fix

Mobile WebViews were crashing on startup when sponsor/logo links used `href="#"` together with `target="_blank"`. Browsers resolve that to an invalid URL like `https://#`, which makes `window.open` throw and trips the app's error boundary.

This repo now guards external navigation in two places:

1. `url-guard.js` runs before the React bundle and blocks invalid `window.open` calls and blank-target clicks.
2. `scripts/patch-bundle.mjs` patches the deployed bundle so link opens go through `__resolveExternalUrl`.

For future source builds, use `src/utils/externalUrl.js` anywhere a link may be `#` or empty.

## Deploy to Vercel

The live app at `traeadvert8pia.vercel.app` must be connected to this repository:

1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the `traeadvert8pia` project (or import `huzaifahp1989/advert`)
3. Set **Root Directory** to `.` and leave **Build Command** empty (static site)
4. Deploy from the `main` branch

### GitHub Actions deploy (recommended)

This repo includes `.github/workflows/vercel-deploy.yml`, which deploys `main` to Vercel on every push.

Add these repository secrets in GitHub (**Settings → Secrets and variables → Actions**):

- `VERCEL_TOKEN` — create at [vercel.com/account/tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` — from Vercel project settings
- `VERCEL_PROJECT_ID` — from Vercel project settings

After secrets are set, push to `main` or run the **Deploy to Vercel** workflow manually.

After deploy, confirm `index.html` includes:

```html
<script src="/url-guard.js"></script>
```

If you rebuild the JS bundle from source, run `npm run patch` before deploying.
