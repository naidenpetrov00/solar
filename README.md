# Solar website

Public solar-installation website built with Next.js. This repository also contains the milestone-one server-side identity and database foundation.

## Local prerequisites

- Node.js 22.12 or newer (required by the installed Better Auth CLI)
- npm
- Docker Desktop or another Docker Engine with Docker Compose

The Compose file provisions PostgreSQL and Mailpit for local development only. They are not production infrastructure, and Docker does not need to be running for schema generation or static validation.

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

Configuration variables:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | Local container database name |
| `POSTGRES_USER` | Local container database user |
| `POSTGRES_PASSWORD` | Local container database password |
| `POSTGRES_PORT` | Host port bound to PostgreSQL |
| `DATABASE_URL` | PostgreSQL connection string used by the application and Drizzle |
| `BETTER_AUTH_SECRET` | Better Auth signing/encryption secret, at least 32 high-entropy characters |
| `BETTER_AUTH_URL` | Canonical application origin, such as `http://localhost:3000` locally |
| `MAILPIT_UI_PORT` | Loopback-only host port for the local Mailpit inbox |
| `MAILPIT_SMTP_PORT` | Loopback-only host port for Mailpit SMTP |
| `SMTP_HOST` | SMTP server hostname; use `127.0.0.1` when Next.js runs on the host |
| `SMTP_PORT` | SMTP server port; Mailpit uses `1025` locally |
| `SMTP_SECURE` | Whether SMTP uses implicit TLS; Mailpit uses `false` locally |
| `SMTP_FROM` | Sender name and address used for authentication emails |
| `SMTP_USERNAME` | Optional SMTP username; production must set it together with `SMTP_PASSWORD` |
| `SMTP_PASSWORD` | Optional SMTP password; production must set it together with `SMTP_USERNAME` |

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

The following command deletes both the local PostgreSQL data and Mailpit's stored emails. Use it only when a deliberate reset is required:

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
npm run auth:generate
```

Compare the generated file with `db/schema/auth.ts`, organize verified changes into the modular schema, remove the temporary file, and then run:

```powershell
npm run auth:check
npm run db:generate
```

## First administrator

Public registration can create `customer` accounts only. It cannot select or submit the `admin` role. After migrations have been applied, provision the first administrator through Better Auth's CLI:

```powershell
npm run auth:provision-admin -- --email admin@example.com --name "Administrator" --role admin
```

Use the real administrator email and name at invocation time. Deliberately omit `--password`: the CLI will prompt without placing the password in source code, `.env`, or shell history. The CLI marks the email as verified by default and warns before creating an administrator when users already exist. Do not bypass that warning with `--force` or `--yes` during normal provisioning.

## Customer authentication status

Localized customer routes are available for sign-up, sign-in, forgot-password, reset-password, and email-verification states. They use the existing Better Auth API at `/api/auth/*`; there are no parallel credential endpoints.

Password accounts must verify their email address before a new sign-in. Registration does not create a session and moves to a neutral check-email state with a resend action. Password recovery also uses a neutral response so the interface does not disclose whether an account exists. Verification and password-reset links expire after one hour, and a successful password reset revokes the user's existing sessions.

Email delivery failures are intentionally hidden from account-dependent browser responses and recorded only as a sanitized `email_delivery_failed` operational event. Registration may therefore succeed even when the first delivery attempt fails; the user can resend without deleting or recreating the account.

Existing unverified development accounts remain unverified. Their next password sign-in is blocked and offers a resend action. Existing sessions created before verification enforcement remain valid until expiry or explicit revocation.

Better Auth's installed version enables its built-in limiter by default in production, including stricter limits for sign-in and sign-up routes. A later milestone must still review and configure persistent rate limiting suitable for the final self-hosted or multi-instance deployment.

No customer profile menu or admin interface is included yet.

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

## Local email with Mailpit

Mailpit captures development email in a persistent named volume. Start only the local mail service when it is needed:

```powershell
docker compose up -d mailpit
```

Open the loopback-only inbox at `http://localhost:8025`. The local SMTP server listens on `127.0.0.1:1025` and does not require a username or password.

When Next.js runs directly on the host, keep `SMTP_HOST=127.0.0.1`. If the application is later placed in the same Compose network, use `SMTP_HOST=mailpit` instead. None of the mail variables should use the `NEXT_PUBLIC_` prefix.

Mailpit is a development capture service, not a production delivery provider. Production still requires a selected SMTP account, a verified sender domain, delivery monitoring, and both SMTP credentials when the provider requires authentication.

## Later Google OAuth configuration

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
