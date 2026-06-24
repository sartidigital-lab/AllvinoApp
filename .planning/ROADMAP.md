# Roadmap: Allvino App

## Active Milestone (v2.0)

**Status:** In progress / needs formal planning sync.

Implemented or partially implemented work already present in the codebase:
- Promotions and coupon management in the admin dashboard.
- Delivery zones and ZIP-based shipping quotes.
- Stock imports, stock snapshots, and checkout stock reservation.
- Admin views for orders, customers, logistics, stock, and promotions.

Remaining planning work before v2.0 can be considered scoped:
- Payment provider integration (Stripe/Mercado Pago or equivalent).
- External freight carrier integration, if Correios/API shipping is still required beyond local delivery zones.
- Transactional checkout verification against the live Supabase project.
- Automated tests for checkout, promotions, shipping, and inventory reservation.

## Milestone History

- [x] **v1.0**: [Archive: MVP Migration & PWA](milestones/v1.0-ROADMAP.md) - Migracao estatica para Next.js PWA, Supabase Auth/DB, Fluxo de Carrinho e Admin Dashboard.
