# STRUCTURE.md

**Date:** 2026-05-17

## Directory Layout
The project employs a completely **flat structure**. All HTML files, images, and configuration files are located in the root directory.

- `/` (Root)
  - `*.html`: Pages (e.g., `index.html`, `admin.html`, `catalogo.html`, etc.)
  - `*.png`, `*.jpg`: Static assets (logos, icons, banners)
  - `manifest.json`: PWA configuration

## Key Locations
- **`index.html`**: Entry point for the user-facing application.
- **`admin.html`**: Entry point for the administrative dashboard.
- **`manifest.json`**: Definition for the Progressive Web App.

## Naming Conventions
Files are named using kebab-case for multiple words (e.g., `admin-login.html`, `recuperar-senha.html`) and lowercase for single words. Images are sometimes uppercase (e.g., `LOGO-ALLVINO-BRANCO.png`).
