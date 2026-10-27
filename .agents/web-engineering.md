# Web engineering guidance

Read this file only for implementation work involving Next.js, React, TypeScript, Tailwind CSS, or Vercel deployment concerns.

## Implementation rules

* Follow the installed framework versions and established App Router conventions. Reuse existing components and patterns before adding new abstractions.
* Prefer Server Components. Add a Client Component only for browser APIs, stateful interaction, or another clear client-only need; keep the client boundary as small as practical.
* Keep domain and business logic outside presentation components. Keep shared business and marketing data easy to locate and change.
* Use TypeScript types that reflect the existing domain model. Do not bypass type safety with broad casts when the underlying model can be expressed clearly.
* Use the existing Tailwind and component conventions. Avoid new dependencies or reusable infrastructure unless an actual repeated need justifies them.
* Protect mobile performance: avoid unnecessary client JavaScript, large dependencies, heavy media, third-party scripts, and layout instability.
* For version-sensitive or unresolved technical gaps, read the relevant local framework documentation first, then consult Context7 before web search.

## Module ownership and size

* Keep handwritten implementation files generally within 100–150 effective lines (excluding blank lines and comments). Crossing 150 lines is a strong signal to examine cohesion, not a mandate for mechanical splitting.
* Give each module, component, hook, service, repository, utility, and configuration unit one clear responsibility. Separate presentation, interaction state, domain rules, data access, validation, types, constants, and configuration when they change for different reasons.
* Colocate code by feature using the established folders. Keep interfaces between modules small and explicit, with imports pointing toward the owner. Avoid circular dependencies and barrel files that obscure ownership.
* Extract only when a boundary isolates change, improves testing, expresses the domain, or removes actual repetition. Avoid speculative abstractions, generic utility dumping grounds, and pass-through wrappers.
* Preserve Server Components by default and keep Client Component entry points narrow. A refactor must not move server-only dependencies into the client graph.
* Generated files, dependency artifacts, migration snapshots, lockfiles, vendored code, and machine-owned data are exempt from the handwritten-source target. If a cohesive handwritten file remains substantially above 150 effective lines, document its responsibility and the concrete reason for keeping it intact.

## File discovery

* Begin with the requested route, component, action, or domain symbol and follow direct imports only as needed.
* Search for symbols before opening complete files. Prefer path-scoped searches and diffs instead of broad repository output.
* Do not load every translation, stylesheet, schema module, migration, or sibling feature when a representative or directly affected file is sufficient.
* Stop exploring after establishing the owning boundary and affected callers. Read `.agents/architecture.md` only for cross-feature work or when ownership remains unclear.
