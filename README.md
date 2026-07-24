# advert

Islam Media Central advertising app (AdvertApp).

## Invalid URL / ad click fix

Some advert listings store placeholder links such as `#`, `https://#`, or `https:/#`.
Opening those with `window.open` (or `target="_blank"`) throws in mobile WebViews:

`Failed to execute 'open' on 'Window': Unable to open a window with invalid URL 'https:/#'`

The app root error boundary previously treated that as fatal and replaced the UI with
**App failed to load**, which looks like adverts disappearing after a tap.

This repo now guards external navigation in three places:

1. An **inline bootstrap guard in `index.html`** wraps `window.open` before React loads
   (avoids SPA rewrite issues that can serve HTML for `/url-guard.js`).
2. `url-guard.js` keeps the same logic as a standalone file for tests/reuse.
3. `scripts/patch-bundle.mjs` patches the production bundle so listing opens go through
   `__resolveExternalUrl` / `__openExternalUrl`, and soft-fails the root error boundary
   for residual invalid-open errors.

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

After deploy, confirm `index.html` includes the inline `PLACEHOLDER_LINK` bootstrap guard
and that `/assets/index-DvXX5t7H.js` contains `__resolveExternalUrl`.

If you rebuild the JS bundle from source, run `npm run patch` before deploying.

### Verify

```bash
npm run patch
npm test
```
