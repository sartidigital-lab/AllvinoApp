# Phase 02: Authentication — Technical Research

## Objective
Investigate how to implement Supabase Authentication (`@supabase/ssr`) within the Next.js App Router, using a Modal/Bottom Sheet for UX, and Middleware for route protection.

## Technical Approach

### 1. `@supabase/ssr` Setup in Next.js App Router
The `@supabase/ssr` package simplifies working with Supabase Auth in environments with Server-Side Rendering (like Next.js). It requires creating clients for different contexts:
- **Server Actions/Components (`createServerClient`)**: To read and write cookies during server mutations or rendering.
- **Middleware (`createServerClient`)**: To refresh sessions and protect routes before rendering.
- **Client Components (`createBrowserClient`)**: To interact with Auth from the browser.

We need a utility folder (e.g., `src/utils/supabase/`) with `server.ts`, `client.ts`, and `middleware.ts`.

### 2. Route Protection (Middleware)
Next.js Middleware (`src/middleware.ts`) will intercept requests.
- If a user attempts to access `/conta` or `/admin` without a valid session, the middleware will redirect them to `/`.
- To trigger the Auth Modal upon redirection, we can append a query parameter, e.g., `/?auth=login` or `/?login=true`.

### 3. Authentication Flow (Server Actions vs Client)
- **Email/Password**: Can be handled via Server Actions (`login` and `signup` functions) to keep credentials secure and rely on form actions.
- **OAuth (Google)**: Supabase OAuth requires a client-side redirection to the provider, which then redirects back to an Auth Callback Route (`/auth/callback`).
- **Callback Route**: `src/app/auth/callback/route.ts` must exchange the code for a session using `supabase.auth.exchangeCodeForSession(code)` and then redirect the user to their intended destination (or home).

### 4. Auth Modal / Bottom Sheet UX
- Since the login UI is a Modal/Bottom Sheet, it should be placed in a global layout (e.g., `src/app/layout.tsx` or a global provider) so it can be opened from anywhere.
- State management: Use a Context Provider (`AuthModalProvider`) or simply Zustand/URL state (`?login=true`) to control the visibility of the modal. URL state is excellent because the Middleware can directly trigger it.
- Tailwind classes: `fixed inset-0 z-50 flex items-center justify-center` for modal, with a backdrop (`bg-black/50 backdrop-blur-sm`).

## Risks & Mitigation

1. **Cookie Expiration/Refresh**: `@supabase/ssr` middleware handles token refresh automatically if configured correctly. Ensure the `supabaseResponse.cookies.set()` logic is implemented properly in the middleware.
2. **OAuth Local Testing**: Google OAuth requires configuring the redirect URI in the Google Cloud Console and Supabase Dashboard. For local dev, `http://localhost:3000/auth/callback` must be whitelisted.
3. **Environment Variables**: The Zod validation (`src/env.mjs`) already checks for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Dependencies to Add
- `@supabase/supabase-js`
- `@supabase/ssr`
- `lucide-react` (for icons in the modal, if not present)

## Conclusion
The path is clear. We will implement the Supabase SSR utilities, build the Auth Callback route, configure the Middleware for protection and query-param redirection, and build the Auth Modal component that reacts to the URL or global state.
