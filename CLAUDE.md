# CLAUDE.md

Guidance for Claude Code when working in this repository. Project-specific detail lives in `agent_docs/`; load only the docs relevant to the task.

## Development commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run type-check   # TypeScript validation
npm run format       # Prettier format
npm test             # Run all tests (vitest)
npm test -- src/__tests__/utils.test.ts        # Single test file
npm test -- src/__tests__/integration/        # Integration tests only
```

Pre-commit hooks run `eslint --fix` + `prettier --write` via Husky/lint-staged and bump the patch version in `package.json`. npm is the only package manager.

## Orientation

Next.js 15 app on Vercel. Users create a **collection** of iCal source URLs and get one combined feed at `/api/calendar/[guid]`. Supabase (custom schema `calendar_aggregator`, anon key, RLS on) is the store; in-memory storage is used only when Supabase env vars are absent. Terms are defined in `UBIQUITOUS_LANGUAGE.md`; the public API is documented in `README.md`.

## Agent docs

| Doc                                                                | Read when                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [agent_docs/architecture.md](agent_docs/architecture.md)           | Touching routes or `src/lib`: route map, module table, create/serve flows, guid rules, headers, GA |
| [agent_docs/storage-supabase.md](agent_docs/storage-supabase.md)   | Changing DB code, migrations, RLS, env vars, or debugging a missing collection (503 vs 404)        |
| [agent_docs/management-tokens.md](agent_docs/management-tokens.md) | Working on PUT/DELETE auth, the manage UI, or rate limiting                                        |
| [agent_docs/ical-processing.md](agent_docs/ical-processing.md)     | Changing source fetching (SSRF, size caps), combining, date windows, or ETag handling              |
| [agent_docs/testing.md](agent_docs/testing.md)                     | Adding or fixing tests: file map, mocking conventions, pre-commit version-bump conflicts           |
