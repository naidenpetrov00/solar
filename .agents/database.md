# Database and catalog guidance

Read this file only for Drizzle, PostgreSQL, catalog, schema, database, or migration work. Authentication and email-delivery rules remain in the relevant `README.md` sections and existing modules.

* Keep database access server-only and follow the existing Drizzle and PostgreSQL connection patterns.
* Keep schemas modular by domain ownership. Preserve the existing separation between schema definitions, repository access, and catalog management logic.
* Make schema and migration changes deliberately. Review their impact on existing data, foreign keys, lifecycle behavior, and localized catalog records before generating or applying migrations.
* Route catalog operations through the established repository and management layers rather than placing persistence rules in UI components or duplicating domain logic.
* Keep product, category, and translation behavior consistent with the established model. Read `.agents/i18n.md` when database work changes localized catalog content or its public routes.
* Use the README for database commands, backup expectations, and operational procedures. Do not run generation or migration commands without explicit user authorization.
