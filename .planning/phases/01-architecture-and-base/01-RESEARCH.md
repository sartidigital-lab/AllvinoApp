# Phase 1: Architecture & Base - Research

## Objective
Identify how to best execute Phase 1 requirements (ARCH-01, ARCH-02, ARCH-03, ARCH-04) based on the decisions captured in `01-CONTEXT.md`, ensuring a smooth transition from a static PWA to a Next.js App Router application without breaking the existing `.planning` and `.git` setup.

## Technical Approaches & Findings

### 1. Next.js Initialization (ARCH-01)
- **Challenge:** The directory `Allvino_App` already contains files (`index.html`, `.git`, `.planning/`). Running `npx create-next-app .` might fail or overwrite existing configuration if not handled carefully.
- **Approach:** 
  - Since we want `src/app` (Decision D-01) and native Tailwind (D-02), we can initialize a new Next.js app in a temporary folder and move the files over, OR manually create `package.json` and install dependencies: `next`, `react`, `react-dom`.
  - Manual setup is safer for brownfield:
    - Create `src/app/layout.tsx` and `src/app/page.tsx`.
    - Create `tsconfig.json` and `next.config.js` (Next.js auto-populates `tsconfig.json` on first run).
    - Move old static HTML files into a `_legacy` folder or keep them until components are fully migrated.

### 2. Tailwind CSS Setup (ARCH-02)
- **Dependencies:** `tailwindcss`, `postcss`, `autoprefixer`.
- **Configuration:** 
  - Run `npx tailwindcss init -p` to generate `tailwind.config.ts` and `postcss.config.js`.
  - Update `tailwind.config.ts` `content` array to include `./src/**/*.{js,ts,jsx,tsx,mdx}`.
  - Create `src/app/globals.css` with `@tailwind base; @tailwind components; @tailwind utilities;`.

### 3. PWA Integration (ARCH-03)
- **Decision:** Use `next-pwa` (Decision D-03).
- **Dependencies:** `next-pwa`.
- **Configuration:**
  - Wrap the Next configuration in `next.config.js`:
    ```javascript
    const withPWA = require('next-pwa')({
      dest: 'public',
      disable: process.env.NODE_ENV === 'development',
      register: true,
      skipWaiting: true,
    });
    module.exports = withPWA({ /* next config */ });
    ```
  - **Assets:** Move the existing `manifest.json` and icons to the `public/` folder. Ensure `src/app/layout.tsx` includes the `<link rel="manifest" href="/manifest.json" />` and theme color meta tags.

### 4. Strict Environment Variables Validation (Decision D-04)
- **Approach:** Use `@t3-oss/env-nextjs` and `zod` for robust validation at build time.
- **Implementation:**
  - Create `src/env.mjs` (or `.ts`) defining the schema for variables like `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Import this file in `next.config.js` so it throws an error during the Vercel build if variables are missing.

### 5. Supabase Setup (Decision D-02)
- **Dependencies:** `@supabase/ssr`, `@supabase/supabase-js`.
- **Implementation:**
  - Setup utility functions in `src/lib/supabase/server.ts`, `client.ts`, and `middleware.ts` following the official Supabase SSR guide for App Router. This establishes the pattern for Phase 2 authentication but sets the foundation now.

### 6. CI/CD Pipeline (ARCH-04)
- **Vercel:** Connecting the GitHub repository to a Vercel project handles deployments automatically. Vercel automatically detects Next.js.
- **GitHub Actions:** Create a `.github/workflows/ci.yml` to run `npm run lint` and `npm run build` on Pull Requests to `main`, ensuring no broken code is merged before Vercel tries to deploy it.

## Dependencies to Install
```bash
# Core
npm install next react react-dom
npm install -D typescript @types/react @types/node

# Styling
npm install -D tailwindcss postcss autoprefixer

# PWA
npm install next-pwa

# Supabase
npm install @supabase/ssr @supabase/supabase-js

# Env Validation
npm install zod @t3-oss/env-nextjs
```

## Validation Architecture
- **Compilation:** `npm run build` must succeed without type errors or missing environment variables.
- **PWA:** Lighthouse report or manual inspection of Application tab must show Service Worker registered and Manifest loaded.
- **CI:** GitHub Action must pass green on a test PR.

## Conclusion
The architecture can be cleanly implemented. The critical point will be avoiding conflicts with existing files in the repository during Next.js initialization. We will scaffold the `src/` directory and configure the tooling manually to preserve the workspace integrity.
