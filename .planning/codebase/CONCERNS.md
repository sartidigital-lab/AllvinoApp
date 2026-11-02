# CONCERNS.md

**Date:** 2026-05-17

## Technical Debt & Issues

1. **Tailwind CDN in Production:**
   The project relies on the Tailwind CSS script tag (`https://cdn.tailwindcss.com`). The official Tailwind documentation states this is meant for development only, as it compiles CSS on the fly in the browser, severely impacting page load performance.

2. **Duplicated Code:**
   Common layout elements, such as the bottom navigation bar and headers, are duplicated across all HTML files. This makes widespread UI changes tedious and prone to errors.

3. **Lack of Build Process:**
   Without a bundler (like Vite or Webpack), assets cannot be minified, and modern JavaScript features or module imports (`import/export`) are harder to manage cleanly.

4. **Flat Structure:**
   As the application grows, keeping all files in the root directory will become unmanageable.

5. **No Version Control Detected:**
   The project does not have a `.git` directory initialized (prior to this analysis), meaning no history or easy rollback mechanisms are in place.
