# Repository architecture

Read this file only for cross-feature changes, repository-wide refactors, or unclear module ownership. Skip it for focused work with an evident owner.

## Ownership map

* `app/[locale]/` owns localized App Router pages and layouts: `(auth)/` for public authentication, `dashboard/` for authenticated administration, and `shop/`, `products/`, and `cart/` for the public catalog journey. Its `_components/` and `_lib/` folders own locale-shell UI and routing helpers.
* `app/api/` owns thin HTTP handlers that delegate domain and persistence work to `lib/`.
* `components/` owns application-wide UI primitives. Keep feature-specific UI with its route or feature.
* `lib/catalog/` owns catalog models, validation, public reads, management operations, and repositories. Storefront code must not depend on dashboard presentation modules.
* `lib/orders/` owns order validation, money calculations, immutable revisions, lifecycle/payment transitions, audit history, and order repositories.
* `lib/auth.ts`, `lib/authorization.ts`, `lib/permission-policy.ts`, and `lib/user-management-*` own authentication, authorization, and user management. `lib/email/` owns email composition and delivery integration.
* `db/schema/` owns Drizzle tables and relations; `db/schema/index.ts` is its export surface. Treat `db/migrations/` as history, not ordinary implementation.
* `i18n.config.ts` defines namespaces. `i18n/locales/<locale>/` owns resources whose namespace and key shapes must match across locales.
* `app/globals.css` is the style entry point; `app/styles/` owns focused global modules by feature or concern.

## Dependency direction

`route/page -> feature component -> hook or server action -> domain service -> repository -> database schema`

* Keep validation and business rules outside JSX and route handlers.
* Keep repositories and database access server-only. Client modules may import serializable types, not server implementations.
* Put shared contracts in neutral type or model modules; avoid circular imports.
* Import from the capability owner. Avoid broad barrels and ownership-hiding wrappers.

## Repository discovery

* Start at the requested entry point and follow direct imports only as needed.
* Search for symbols before opening files; prefer path-scoped searches and diffs.
* Load sibling locales, styles, or schema modules only when consistency requires it.
* Skip generated output, dependencies, migrations, lockfiles, and unrelated features unless directly relevant. Stop after finding the owner and affected callers.

## Maintaining this map

Update this document only when a change alters a major feature boundary, ownership rule, primary entry point, or dependency direction. Do not list ordinary files that follow an existing boundary.
