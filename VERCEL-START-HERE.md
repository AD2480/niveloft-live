# Deploy Niveloft to Vercel

## 1. Upload to GitHub
Extract the ZIP and upload its contents, not the ZIP file itself. The repository root must contain `package.json`, `package-lock.json`, `vercel.json`, and the `frontend` and `backend` folders. Preserve hidden files when uploading. Do not upload node_modules or dist.

## 2. Import the repository in Vercel
Use these settings together:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | Leave blank (repository root) |
| Install Command | npm ci --include=dev |
| Build Command | npm run build |
| Output Directory | frontend/dist |
| Node.js Version | 24.x |

The root vercel.json supplies the build settings. Remove conflicting old dashboard overrides before redeploying.

If you deliberately select `frontend` as Root Directory, use `dist` as Output Directory instead. The frontend/vercel.json supports that layout too. Never mix the two output paths.

## 3. Choose the deployment mode BEFORE clicking Deploy

### Browser-only demonstration (no backend needed)
Add this Vercel environment variable for each environment you deploy (Production and/or Preview):

```text
VITE_USE_MOCK_API=true
```

The existing demo API then runs in the visitor's browser. Sample accounts appear on the login page. This is only a demonstration: data stays in that browser; accounts, email, payments, uploads and server AI are not production services. Do not enter real customer or payment data. No automatic demo fallback has been added.

### Real application with persistent shared data
Deploy the included Spring Boot backend and MySQL separately using DEPLOYMENT.md. Add these Vercel environment variables:

```text
VITE_USE_MOCK_API=false
VITE_SHOW_SAMPLE_ACCOUNTS=false
VITE_API_BASE_URL=https://YOUR-ACTUAL-BACKEND-DOMAIN/api
```

Replace the placeholder with your running backend's HTTPS URL. This static Vercel build does not run Java or MySQL. `/api` and localhost are not valid backend addresses for this deployment. The build intentionally stops if the real backend URL is missing.

Set `APP_URL` and `CORS_ALLOWED_ORIGINS` on the backend to your real Vercel origin. Preview domains need to be allowed explicitly if they use that backend. Keep JWT secrets, database passwords, payment credentials, and AI provider keys on the backend only; VITE_ values are public.

Optional frontend values: `VITE_SITE_URL` (your canonical production origin), `VITE_OPERATOR_NAME`, `VITE_CONTACT_EMAIL`, and `VITE_TURNSTILE_SITE_KEY` if configured on the backend. Changing a frontend variable requires a new deployment.

## 4. Verify after deployment
Open `/`, `/login`, `/pricing`, and `/flurry` directly. Sign in, navigate to a project, then refresh its nested URL. Public HTML pages and the existing `/app` rewrite are preserved to support deep links without replacing public SEO pages. Check account creation and data persistence across two browsers in live mode; in demo mode browser-local data is expected.

## Local checks
Use Node 24, then run from the repository root:

```bash
npm ci --include=dev
npm run typecheck
npm test
npm run build
```

To build the browser demo on macOS/Linux:

```bash
VITE_USE_MOCK_API=true npm run build
npm run preview
```

## What changed in this package
- Explicit Vite framework and install/build/output settings in both supported project roots.
- Node 24 pinned consistently in package manifests, lockfiles, and .nvmrc.
- Vercel upload exclusions for generated dependencies, build files, and local environment overrides.
- This guide distinguishes a no-backend demonstration from the real deployment.

Existing UI, route-specific rewrites, security headers, and real-backend build guards are retained.

Official references: https://vercel.com/docs/frameworks/frontend/vite and https://vercel.com/docs/project-configuration/vercel-json

## Validation performed on this package
- Clean npm dependency installation succeeded on Node 24.
- TypeScript checking and Vite production compilation passed with VERCEL=1 and an example HTTPS API URL (build only; no backend connectivity was claimed).
- Browser-demo production compilation passed with VERCEL=1 and VITE_USE_MOCK_API=true.
- All 275 existing frontend tests passed across 40 files, including SEO generation tests.
- Vite reports a non-blocking large JavaScript chunk warning.
- No deployment to a Vercel account or live Java/MySQL end-to-end verification was performed.
