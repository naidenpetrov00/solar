# Solar website

Public solar-installation website built with Next.js. This repository also contains the milestone-one server-side identity and database foundation.

## Local prerequisites

- Node.js 22.12 or newer (required by the installed Better Auth CLI)
- npm
- Docker Desktop or another Docker Engine with Docker Compose

The Compose file provisions PostgreSQL for local development only. It is not production infrastructure, and Docker does not need to be running for schema generation or static validation.

## Environment configuration

Copy the committed template to an ignored local file:

```powershell
Copy-Item .env.example .env
```

Replace every placeholder in `.env`. Generate a high-entropy Better Auth secret with:

```powershell
npm run auth:secret
```

Copy the generated value into `BETTER_AUTH_SECRET`. The variables are server-only; do not rename them with a `NEXT_PUBLIC_` prefix.

Required variables:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | Local container database name |
| `POSTGRES_USER` | Local container database user |
| `POSTGRES_PASSWORD` | Local container database password |
| `POSTGRES_PORT` | Host port bound to PostgreSQL |
| `DATABASE_URL` | PostgreSQL connection string used by the application and Drizzle |
| `BETTER_AUTH_SECRET` | Better Auth signing/encryption secret, at least 32 high-entropy characters |
| `BETTER_AUTH_URL` | Canonical application origin, such as `http://localhost:3000` locally |

Keep `.env` out of source control. Production credentials must come from the deployment environment or its secret manager.

## Local PostgreSQL

Start only the development database when it is needed:

```powershell
docker compose up -d database
```

Check its status:

```powershell
docker compose ps
```

Stop the container while preserving the named volume:

```powershell
docker compose down
```

The following command also deletes the local database volume and all of its data. Use it only when a deliberate reset is required:

```powershell
docker compose down --volumes
```

## Drizzle schema and migrations

Apply all committed migrations after PostgreSQL is healthy:

```powershell
npm run db:migrate
```

The schema is split by ownership:

- `db/schema/auth.ts` contains the Better Auth identity, session, account, verification, and Admin plugin fields.
- `db/schema/profiles.ts` contains application-owned profile data separately from authentication records.
- `db/schema/index.ts` exposes the complete Drizzle schema.

After an intentional schema change, generate and review a new migration:

```powershell
npm run db:generate
```

Do not use `drizzle-kit push` for shared environments. Commit reviewed SQL migrations and apply them with `npm run db:migrate` as a separate deployment step.

When changing Better Auth options or plugins, regenerate its expected Drizzle schema first:

```powershell
npm exec auth -- generate --config ./lib/auth.ts --output ./db/schema/auth.generated.ts --adapter drizzle --dialect postgresql --yes
```

Compare the generated file with `db/schema/auth.ts`, organize verified changes into the modular schema, remove the temporary file, and then run:

```powershell
npm run auth:check
npm run db:generate
```

## First administrator

Public sign-up is disabled. After migrations have been applied, provision the first administrator through Better Auth's CLI:

```powershell
npm run auth:provision-admin -- --email admin@example.com --name "Administrator" --role admin
```

Use the real administrator email and name at invocation time. Deliberately omit `--password`: the CLI will prompt without placing the password in source code, `.env`, or shell history. The CLI marks the email as verified by default and warns before creating an administrator when users already exist. Do not bypass that warning with `--force` or `--yes` during normal provisioning.

The milestone exposes Better Auth at `/api/auth/*` for provisioned identities but adds no public sign-in, sign-up, password-reset, profile, or admin UI.

## Database backup expectation

The named Docker volume provides persistence, not a backup. Create and verify a backup before destructive resets, PostgreSQL upgrades, or risky migrations. The following PowerShell commands create a custom-format backup without exposing the password on the command line:

```powershell
docker compose exec database sh -c 'pg_dump --format=custom --file=/tmp/solar.dump --username="$POSTGRES_USER" "$POSTGRES_DB"'
$databaseContainer = docker compose ps -q database
docker cp "${databaseContainer}:/tmp/solar.dump" .\solar.dump
```

To restore into an empty target database:

```powershell
$databaseContainer = docker compose ps -q database
docker cp .\solar.dump "${databaseContainer}:/tmp/solar.dump"
docker compose exec database sh -c 'pg_restore --exit-on-error --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" /tmp/solar.dump'
```

Store backups outside the Docker volume and test restoration periodically. A production deployment needs automated, encrypted, off-server backups with a defined retention policy.

## Later email and Google OAuth configuration

SMTP and Google OAuth are intentionally not enabled in this milestone.

Email verification and password reset will later require a selected mail provider and deployment secrets equivalent to:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`

The sender domain and address must be verified with the selected provider before enabling those Better Auth callbacks.

Google OAuth will later require `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Configure these external URLs in Google Cloud:

- Local authorized origin: `http://localhost:3000`
- Local redirect URI: `http://localhost:3000/api/auth/callback/google`
- Production authorized origin: the exact HTTPS value of `BETTER_AUTH_URL`
- Production redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`

Do not add Google credentials until the provider is actually enabled, and never expose the client secret to browser code.

## Available validation commands

These commands perform static checks and do not start the application:

```powershell
npm run auth:check
npm run typecheck
npm run lint
```
