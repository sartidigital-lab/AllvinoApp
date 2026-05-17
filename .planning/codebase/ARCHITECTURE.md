# ARCHITECTURE.md

**Date:** 2026-05-17

## Architecture Pattern
The project uses a **Multi-Page Application (MPA)** architecture.
There is no client-side router (like React Router or Vue Router). Navigation between views occurs via standard HTML anchor links (`<a href="catalogo.html">`), causing full page reloads.

## Data Flow
Currently, there is no explicit data flow management (e.g., Redux, Context API) or API fetching patterns visible in the core HTML files. Data is mostly static or mocked directly in the HTML.

## Entry Points
- `index.html`: The main landing page.
- Other entry points include `catalogo.html`, `admin.html`, `conta.html`, `checkout.html`, and `login.html`.
