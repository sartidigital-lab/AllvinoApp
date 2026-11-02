# Roadmap: Allvino App

## Active Milestone (v2.0)

**Status:** Audit and hardening completed; production configuration deferred.

Implemented or partially implemented work already present in the codebase:
- Promotions and coupon management in the admin dashboard.
- Delivery zones and ZIP-based shipping quotes.
- Stock imports, stock snapshots, and checkout stock reservation.
- Admin views for orders, customers, logistics, stock, and promotions.

Remaining product roadmap work:
- Payment provider integration (Stripe/Mercado Pago or equivalent).
- External freight carrier integration, if Correios/API shipping is still required beyond local delivery zones.

Production-readiness work deferred:
- Upgrade Supabase plan if leaked-password protection is required.
- Enable leaked-password protection in Authentication > Attack Protection.
- Revisit legacy analytics and remaining infrastructure warnings.
- Repeat the full production verification checklist before launch.

## Milestone History

- [x] **v1.0**: [Archive: MVP Migration & PWA](milestones/v1.0-ROADMAP.md) - Migracao estatica para Next.js PWA, Supabase Auth/DB, Fluxo de Carrinho e Admin Dashboard.
