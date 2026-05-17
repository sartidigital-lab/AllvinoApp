# CONVENTIONS.md

**Date:** 2026-05-17

## Code Style
- **HTML**: Uses HTML5 semantic elements (`<main>`, `<section>`, `<nav>`, `<header>`).
- **CSS**: Uses utility classes extensively via Tailwind CSS. Custom styles are occasionally injected directly into the `<head>` using `<style>` tags (e.g., for Google Material Symbols configuration).
- **Mobile-first**: The design implements responsive principles using Tailwind's responsive prefixes (e.g., `md:text-5xl`).

## Patterns
- **Navigation/Footers**: Menus and common UI components (like bottom navigation bars) are duplicated across multiple HTML files rather than imported as components.
- **Styling**: Inline utility classes are preferred over custom CSS files.
