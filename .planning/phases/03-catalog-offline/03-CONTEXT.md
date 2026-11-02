# Phase 03: Catalog & Offline - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Source:** REQUIREMENTS.md

<domain>
## Phase Boundary

This phase migrates the static catalog into a dynamic catalog powered by Supabase PostgreSQL. It covers fetching wine data, displaying the catalog and individual product pages, and implementing an offline-first strategy using IndexedDB so the catalog remains available without an internet connection.
</domain>

<decisions>
## Implementation Decisions

### Database & Fetching
- **CATL-01**: Wine data will be fetched from Supabase PostgreSQL database. We will need a `products` or `wines` table schema and the corresponding data access layer.
- **CATL-02**: The catalog list page will display the data dynamically.
- **CATL-03**: The wine detail page will display specific product information dynamically.

### Offline Strategy
- **CATL-04**: Implement an offline-first approach caching the catalog in IndexedDB. When offline, the app should serve the cached data instead of failing. We will use a library like `idb` for indexedDB interactions.

### UI/UX
- Use the existing HTML components (from `catalogo.html` and `index.html`) as references for the visual design, converting them to Next.js React components styled with Tailwind CSS.

### Agent's Discretion
- Database table schema for wines.
- State management hook for syncing Supabase data to IndexedDB.
- Fallback UI components when offline but no cache is present.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**
- `.planning/REQUIREMENTS.md` — Central requirements document.
- `catalogo.html` — Source HTML reference for visual layout of the catalog.
- `index.html` — Source HTML reference for individual product sections.
</canonical_refs>

<specifics>
## Specific Ideas
- Create a reusable `useWines` custom hook that abstracts the Supabase fetch and IndexedDB fallback logic.
</specifics>

<deferred>
## Deferred Ideas
- Shopping cart, checkout, and inventory decrement (these belong to Phase 4).
</deferred>

---

*Phase: 03-catalog-offline*
*Context gathered: 2026-05-17*
