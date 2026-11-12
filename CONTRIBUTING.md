# Contributing to ON-GI

Thank you for helping light up prayer around the world. ON-GI is MIT licensed.
This guide is short on purpose; the full working agreements are in [docs/memory/working-agreements.md](docs/memory/working-agreements.md) (Korean).

## Before you write code

1. **Open an issue first** for anything beyond a typo. Describe the problem, then the approach you have in mind. We agree on the direction before implementation.
2. Read [docs/memory/project-state.md](docs/memory/project-state.md) for the current features, known pitfalls and backlog, and skim the decision log in [docs/decisions/](docs/decisions/).

## Setup

See the [README](README.md#local-setup). You need Node 20, Docker and the pinned Supabase CLI (`npx -y supabase@2.122.0`).

## Making changes

- Branch from `main` (`feat/...`, `fix/...`, `docs/...`). Never commit directly to `main`.
- Follow [CLAUDE.md](CLAUDE.md): TypeScript strict, Tailwind only, the tone-on-tone design tokens, Supabase clients from `src/lib/supabase/`.
- New user-facing text goes into **all five** files in `messages/` (ko, en, es, fr, pt).
- Database changes: one migration file under `supabase/migrations/`, **RLS on every table**. Do not expose other churches' prayer totals to clients.
- Do not add dependencies without discussing them in the issue.

## Before opening a pull request

- `npm run lint` and `npm run build` pass
- Attach **mobile screenshots** (about 390×844) of every screen you touched. Bottom UI (tab bar, sheets, dropdowns) breaks most often on mobile
- If you made a product or architecture decision, add an ADR in [docs/decisions/](docs/decisions/) and update [project-state.md](docs/memory/project-state.md)
- Clear commit messages that say what changed and why

## Security

Never commit `.env.local`, Supabase service role keys or database passwords. Supabase anon keys and Mapbox public tokens are designed to be public, but keep them out of the repository anyway; use [.env.example](.env.example) as the template.
If you find a security issue, please report it privately to the maintainer through GitHub instead of opening a public issue.
