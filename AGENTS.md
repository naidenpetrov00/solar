# AGENTS.md

## Project

This repository contains a public solar-installation marketing website. Help visitors understand suitable solar solutions, build trust, and become qualified leads across organic, paid, direct, and referral traffic.

## Universal rules

* Use the installed Next.js App Router, TypeScript, Tailwind CSS, and Vercel conventions.
* Reuse existing patterns and components; prefer Server Components, and use Client Components only when interaction requires them.
* Keep business logic separate from presentation, reusable data easy to modify, and secrets or environment-specific values out of source.
* Use the shared `Button` / `ButtonLink` components for every button-like CTA. Use `primary`, `secondary`, or `informational` by action priority; reserve `danger` for destructive actions.
* Do not invent company facts or commitments, including prices, warranties, certifications, statistics, project results, savings, testimonials, or equipment specifications. Use clear placeholders or request verified information.

## Read supporting guidance only when needed

Do not read every supporting guide by default. Read only the guide whose trigger matches the task:

* Application implementation using Next.js, React, TypeScript, or Tailwind CSS: `.agents/web-engineering.md`.
* UI, CSS, motion, responsive layout, forms, or navigation: `DESIGN.md`; use `impeccable` or `accessibility` when applicable.
* Product positioning, visitor-facing content, or user journeys: `PRODUCT.md`.
* Localization, locale routing, language switching, translated content, or translated metadata: `.agents/i18n.md`.
* Marketing, paid ads, analytics, attribution, tracking, or consent: `.agents/marketing.md`.
* SEO, metadata, structured data, sitemap, or service/local-intent pages: `.agents/seo.md`.
* Drizzle, PostgreSQL, catalog, schema, database, or migration work: `.agents/database.md`.
* Better Auth or email-delivery work: the relevant `README.md` section and existing modules.
* Cross-feature changes, repository-wide refactors, or unclear module ownership: `.agents/architecture.md`. Do not read it for focused changes with an evident owner.

## Task discipline

1. Inspect the relevant implementation and supporting guidance before changing it.
2. Make the smallest coherent change that preserves the existing architecture and leaves future extension possible.
3. Do not run tests, production builds, development servers, previews, the application, database generation, or migrations unless the user explicitly requests it. Static inspection and code changes are allowed.
4. Never hand-author or manually patch generated artifacts when the project provides a canonical command that produces them. This includes database migrations and snapshots, generated schemas, code-generated files, dependency lockfiles, and framework-managed files. Do not run the generating command yourself: provide the user with the exact command and any prerequisites, wait for the user to run it, then inspect and review the generated output before continuing.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
