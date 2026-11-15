# Aire Library Architecture

## Current stack

- Hosting: GitHub Pages
- UI: Vanilla HTML / CSS / ES modules
- Local database: IndexedDB
- Public-domain discovery: Project Gutenberg via Supabase Edge Function proxy
- EPUB parser: JSZip
- PDF parser: PDF.js
- Cloud sync: planned

## Data boundaries

### Public repository

May contain:
- frontend source
- design tokens
- schema/migration files without secrets
- public documentation

Must never contain:
- translation API keys
- Supabase service-role/secret keys
- private book files
- private reading records

### Browser local storage

- reader / glass / translation endpoint settings
- translation API key (local-only for the current prototype)
- IndexedDB: imported files, parsed book content, chapters, progress, notes, folders

### Future Aire Library Supabase project

- private user/library data
- original book objects in Storage
- parsed text and chapter metadata
- translations
- highlights / notes / note threads
- shared reading positions
- per-book 「叙说」
- optional user/backend connection metadata

It must be separate from aire-private-journal / Private Vault.

## Distribution model

The app should remain useful without an account. A future shareable build can offer:

1. Local-only mode — zero setup.
2. Self-hosted sync — user connects their own Supabase project.
3. Optional hosted mode — only if later worth maintaining.

This keeps 思帆姐姐 or another user from ever touching 隐's backend data.
