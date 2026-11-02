# Phase 5: Admin Dashboard - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Source:** Project Requirements and admin.html

<domain>
## Phase Boundary

This phase implements the final missing piece of the MVP: the Administration Dashboard. It converts the existing `admin.html` mockup into a fully functional, protected Next.js app segment (`/admin`). It will provide the business owner with BI analytics, catalog management (CRUD), promotions management, and team settings.
</domain>

<decisions>
## Implementation Decisions

### Route Structure
- Base route: `/admin`
- Layout: `/admin/layout.tsx` (applies the Sidebar navigation and enforces route protection).
- Protected: Yes, requires active Supabase Auth session.

### Navigation (Sidebar)
- Tabs from `admin.html`: BI Analytics, Catálogo, Promoções, Equipe, Perfil.
- We will map these tabs to actual sub-routes:
  - `/admin` (Analytics by default)
  - `/admin/catalogo`
  - `/admin/promocoes`
  - `/admin/equipe`
  - `/admin/perfil`

### BI Analytics
- Display Faturamento, Garrafas Vendidas, Total de Pedidos.
- Top 10 Produtos and Vendas por Vendedor.
- Connect to `orders` and `order_items` tables for data.

### Catalog Management
- CRUD for `wines` (Produtos).
- Integration with Supabase Storage for uploading product photos.
- CRUD for Categories.

### Promotions & Team
- CRUD for Promotions (banners, kits).
- Basic team management (listing/adding users to `equipe` table or managing roles if implemented).
- Profile updating (reusing logic from user profile but in admin layout).
</decisions>

<canonical_refs>
## Canonical References

- `admin.html` (Original UI mockup for the admin panel)
- `src/lib/database/wines.ts` (Existing database layer for catalog)
- `src/lib/database/orders.ts` (Existing database layer for orders)
</canonical_refs>

---
*Phase: 05-admin-dashboard*
