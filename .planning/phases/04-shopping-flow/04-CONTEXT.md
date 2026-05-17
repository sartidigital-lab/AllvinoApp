# Phase 04: Shopping Flow - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Source:** REQUIREMENTS.md

<domain>
## Phase Boundary

This phase implements the complete e-commerce shopping journey, including adding items to a persistent shopping cart, proceeding through checkout, and allowing authenticated users to view their past orders in their account area.
</domain>

<decisions>
## Implementation Decisions

### Cart State
- **SHOP-01 & SHOP-02**: The shopping cart needs to be persisted locally so it survives reloads. Since it's client-side state, we can use a React Context or a robust state management library like `zustand`, persisting to `localStorage`. We will use a standard React Context combined with localStorage for simplicity.

### Checkout Flow
- **SHOP-03**: The checkout process will use the design from `checkout.html` and should capture the items in the cart and calculate totals.
- A Supabase `orders` and `order_items` table structure will be needed to record successful checkouts. 
- *Note:* Payment integration is deferred to Phase v2 (PAY-01). Checkout will just simulate placing the order and insert it into the database.

### Order History
- **SHOP-04**: The user account page (`/conta`, derived from `conta.html`) will fetch and display orders associated with the currently logged-in user from the Supabase database.

### Agent's Discretion
- Database schema for `orders` and `order_items`.
- Global state shape for the Cart (items, quantities, subtotal, discount logic like "Retirada na loja -10% OFF" from `catalogo.html`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**
- `.planning/REQUIREMENTS.md`
- `checkout.html` — Source HTML reference for the checkout visual layout.
- `conta.html` — Source HTML reference for the account/order history layout.
- `catalogo.html` — Reference for the cart overlay UI and discount logic.
</canonical_refs>

<specifics>
## Specific Ideas
- Implement a global `CartProvider` wrapping the application.
- The global Cart Overlay should be accessible from any page.
</specifics>

<deferred>
## Deferred Ideas
- Real payment gateway integration (Stripe/Mercado Pago) is out of scope for v1.
- Dynamic shipping calculation (Correios) is out of scope for v1.
</deferred>

---

*Phase: 04-shopping-flow*
*Context gathered: 2026-05-17*
