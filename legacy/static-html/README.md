# Legacy static HTML

These files are retained only as historical reference while the App Router
implementation under `src/app` is the supported application.

They are intentionally outside the deployable root surface. Do not serve them
directly: they contain legacy Supabase client code and unsafe DOM templating
patterns that are not part of the current application.
