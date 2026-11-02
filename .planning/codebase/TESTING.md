# TESTING.md

**Date:** 2026-06-02

## Overview

The project has automated build and smoke verification, but no full unit, integration, or E2E framework yet.

## Current Coverage

- **Typecheck**: `npm run typecheck` runs `tsc --noEmit`.
- **Production build**: `npm run build` verifies Next.js compilation and route generation.
- **Smoke checks**: `npm run smoke` verifies key feature files and required implementation guards.
- **Domain rule checks**: `npm run smoke` also runs deterministic checks for delivery ZIP handling, shipping fee rules, promotion normalization, active windows, minimum subtotal, and max discount.
- **Remote checkout RPC verification**: `npm run verify:checkout-rpc` creates a real test order against the linked Supabase project, validates totals and stock reservation, restores stock, and deletes the test order. It requires `SUPABASE_ACCESS_TOKEN` or `.supabase-token.local`.

## Remaining Gaps

- **Unit Tests**: No Vitest/Jest suite yet.
- **Integration Tests**: Checkout RPC has a manual remote verification script, but there is no broader automated Supabase integration suite yet.
- **E2E Tests**: No Playwright/Cypress checkout/admin flows yet.

## Recommendations

- Expand integration coverage beyond `create_order_with_stock_reservation`, especially delivery-zone quotes, promotions, stock imports, and admin order status updates.
- Add E2E coverage for login, catalog, cart, checkout, admin order status changes, promotion creation, delivery zone creation, and stock import.
- Keep payment tests isolated from production gateways through provider sandbox credentials.
