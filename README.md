# Solar website

Public solar-installation website built with Next.js, including a database-driven multilingual catalog, cart, customer authentication, and administration dashboard.

## Local prerequisites

- Node.js 22.12 or newer (required by the installed Better Auth CLI)
- npm
- Docker Desktop or another Docker Engine with Docker Compose

The Compose file provisions PostgreSQL, Mailpit, and development-only LocalStack S3 object storage. They are not production infrastructure, and Docker does not need to be running for schema generation or static validation.

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
| `PUBLIC_SITE_URL` | Canonical public website origin used by metadata, sitemap, and structured data |
| `BETTER_AUTH_SECRET` | Better Auth signing/encryption secret, at least 32 high-entropy characters |
| `BETTER_AUTH_URL` | Better Auth origin, such as `http://localhost:3000` locally; it is not used for public SEO URLs |
| `LOCALSTACK_GATEWAY_PORT` | Loopback-only LocalStack S3 gateway port; defaults to `4566` |
| `CATALOG_STORAGE_PUBLIC_BASE_URL` | Public base URL serving immutable `catalog/assets/` objects; local LocalStack uses path-style addressing |
| `CATALOG_STORAGE_S3_ENDPOINT` | Server-only S3-compatible endpoint; local LocalStack or production Hetzner Object Storage |
| `CATALOG_STORAGE_S3_REGION` | S3-compatible region matching the bucket location |
| `CATALOG_STORAGE_S3_BUCKET` | Bucket used only for catalog-managed public assets and private pending uploads |
| `CATALOG_STORAGE_S3_ACCESS_KEY_ID` | LocalStack uses `test`; production uses a server-only least-privilege object-storage access key |
| `CATALOG_STORAGE_S3_SECRET_ACCESS_KEY` | LocalStack uses `test`; production uses a server-only object-storage secret key |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth client ID; enable it together with `GOOGLE_CLIENT_SECRET` |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth client secret; never expose it to browser code |
| `FACEBOOK_CLIENT_ID` | Optional Facebook app ID; enable it together with `FACEBOOK_CLIENT_SECRET` |
| `FACEBOOK_CLIENT_SECRET` | Optional Facebook app secret; never expose it to browser code |
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

The following command deletes local PostgreSQL data, Mailpit's stored emails, and LocalStack objects. Use it only when a deliberate reset is required:

```powershell
docker compose down --volumes
```

## Local object storage

Running the full local stack starts the LocalStack S3 emulator alongside PostgreSQL and Mailpit:

```powershell
docker compose up -d
docker compose ps
docker compose logs object-storage
```

The LocalStack READY hook creates the `solar-catalog` bucket and applies the reviewed public-read, CORS, and lifecycle configuration idempotently. A successful startup log includes `LocalStack catalog bucket 'solar-catalog' is ready.` The S3 gateway is available at `http://127.0.0.1:4566`; this S3-only archive has no local management console, and the catalog dashboard remains the media-management interface.

Check the emulator health from PowerShell with:

```powershell
Invoke-RestMethod http://127.0.0.1:4566/_localstack/health
```

The local bucket keeps `catalog/pending/*` private and exposes only `catalog/assets/*` for anonymous download. Direct browser POST uploads are allowed from both local Next.js origins. A lifecycle rule expires pending objects after two days and never applies to final assets. To reapply the local bucket baseline after changing bootstrap assets, recreate the emulator:

```powershell
docker compose up -d --force-recreate object-storage
```

`docker compose down` preserves the PostgreSQL, Mailpit, and LocalStack volumes. Do not reset PostgreSQL or LocalStack independently: catalog rows can then point to missing local objects, or objects can be left unreferenced. Use the full `down --volumes` reset above when a clean local catalog is required.

Local development uses LocalStack's conventional `test`/`test` signing credentials. They are emulator values, not secrets or a substitute for production access control. Production must use restricted Hetzner Object Storage credentials through the same S3-compatible adapter and immutable provider/key model.

The pinned `s3-community-archive` image is frozen and receives no security updates. It is intentionally bound to loopback for local development only and must not be exposed publicly, used in production, or treated as proof of exact Hetzner behavior. Moving to another S3-compatible development or production service changes configuration, not stored provider/key data or catalog code.

## Drizzle schema and migrations

Apply all committed migrations after PostgreSQL is healthy:

```powershell
npm run db:migrate
```

The schema is split by ownership:

- `db/schema/auth.ts` contains the Better Auth identity, session, account, verification, and Admin plugin fields.
- `db/schema/catalog-*.ts` separates category, specification, product, and media tables from their relations.
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

## Roles and first owner account

The authorization model has three roles:

- `customer` is the default public account and has no administration access.
- `administrator` can access the future dashboard and manage customer accounts only.
- `admin` is the single owner account and is the only role that can create or manage administrators.

Public email/password and social registration always create `customer` accounts. Browser-controlled payloads cannot select `administrator` or `admin`. The generic Better Auth Admin endpoints remain owner-only because their operation permissions are not target-aware; future administrator workflows must use the centralized application authorization helpers.

Management endpoints cannot target the owner account or create/assign the `admin` role. Normal owner self-service actions, including logout and ordinary session management, remain available. Management flows also cannot set passwords directly; future user management must use password-reset delivery.

The database permits at most one `admin`. Before applying the role migration, create a verified backup and confirm that no more than one owner account exists. Existing `customer` and `admin` records remain valid and require no backfill.

Rolling this migration back requires first reclassifying every `administrator` as an allowed legacy role, then dropping `user_single_admin_idx` and restoring the previous two-role check. Do not silently demote accounts as part of an automated rollback.

After migrations have been applied, provision the first owner account through Better Auth's CLI only when no `admin` already exists:

```powershell
npm run auth:provision-admin -- --email admin@example.com --name "Administrator" --role admin
```

Use the real owner email and name at invocation time. Deliberately omit `--password`: the CLI will prompt without placing the password in source code, `.env`, or shell history. The CLI marks the email as verified by default and warns before creating an owner when users already exist. Do not bypass that warning with `--force` or `--yes` during normal provisioning, and do not rerun the command when an owner already exists.

## Customer authentication status

Localized customer routes are available for sign-up, sign-in, forgot-password, reset-password, and email-verification states. They use the existing Better Auth API at `/api/auth/*`; there are no parallel credential endpoints.

Password accounts must verify their email address before a new sign-in. Registration does not create a session and moves to a neutral check-email state with a resend action. Password recovery also uses a neutral response so the interface does not disclose whether an account exists. Verification and password-reset links expire after one hour, and a successful password reset revokes the user's existing sessions.

Email delivery failures are intentionally hidden from account-dependent browser responses and recorded only as a sanitized `email_delivery_failed` operational event. Registration may therefore succeed even when the first delivery attempt fails; the user can resend without deleting or recreating the account.

Existing unverified development accounts remain unverified. Their next password sign-in is blocked and offers a resend action. Existing sessions created before verification enforcement remain valid until expiry or explicit revocation.

When both Google OAuth variables are configured, the same localized sign-in and registration pages offer Google sign-in through the existing Better Auth handler. Better Auth's secure implicit-linking defaults remain in place: Google is not a trusted provider, and a matching Google email links only when both the Google claim and the existing local password account are verified. A matching unverified local account is not linked and receives no session; Google never marks that account verified. New Google accounts use the existing default `customer` role, and no role is taken from browser input or the Google profile.

When both Facebook OAuth variables are configured, the same localized pages also offer Facebook sign-in through the existing Better Auth handler. Facebook email addresses are treated as unverified: a new Facebook user must complete the existing email-verification flow before receiving a session. Facebook is not a trusted provider, so it cannot implicitly link to an existing account with a matching email address. Existing users must continue with email and password, using password recovery if needed; retrying Facebook cannot link the accounts. New Facebook users receive the existing `customer` role; existing users retain their stored roles.

Better Auth's installed version enables its built-in limiter by default in production, including stricter limits for sign-in and sign-up routes. A later milestone must still review and configure persistent rate limiting suitable for the final self-hosted or multi-instance deployment.

The customer profile menu and logout experience are available. The administration dashboard includes user and database-driven catalog management for authorized roles.

## Database-driven catalog

The public shop, product routes, category routes, and cart read from the PostgreSQL catalog. Catalog categories have Bulgarian and English route slugs; Turkish and Ukrainian use the project's established locale fallback rules. Product slugs are unique within the locale-aware routing model. A slug may change only before the record's first publication; `published_at` records that first publication permanently and is retained when an item is unpublished, archived, or restored.

Products receive an immutable, database-generated SKU such as `PRD-000001`. Optional brand, GTIN/EAN, and MPN values are stored directly on the product. Brand is non-localized, GTIN/EAN is checksum-validated by the server domain, and MPN is not globally unique.

Prices are stored as EUR integer minor units. Administrator input may be VAT-inclusive or VAT-exclusive, but the fixed catalog VAT rate is 20 percent and the public VAT-inclusive amount is calculated with integer half-up rounding. Direct-purchase products require an exact price and manual `in_stock` or `out_of_stock` availability. Enquiry products have no availability value and may use exact, from, or price-on-request presentation.

Normal catalog management uses draft, published, and archived lifecycle states and exposes no hard-delete command. Foreign keys protect referenced data, while reviewed migrations and deliberate maintenance may delete records in dependency-safe order. Category cycles beyond direct self-parenting are prevented by the transactional catalog management service rather than database triggers.

Both `administrator` and `admin` roles have `catalog:view` and `catalog:manage`; customers have neither. There is no separate publishing role in this milestone.

## Catalog object storage

Managed product images, product PDF documents, and category covers use an application-owned storage boundary backed initially by Hetzner's S3-compatible API. The database stores the logical provider ID and immutable object key, never a Hetzner URL. Browser uploads go directly to the bucket through short-lived signed POST policies; the Next.js server authorizes and verifies uploads but does not proxy file bodies.

Use a dedicated bucket. `catalog/pending/*` must remain private. Anonymous reads may be granted only to `catalog/assets/*`; anonymous list, write, and delete access must remain denied. The application credential needs only the object actions required to create signed uploads, inspect temporary objects, copy them to final keys, and delete owned objects: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, and the equivalent metadata/head access for the two prefixes. Bucket-policy and credential administration should use a separate infrastructure identity.

The bucket CORS policy must name the exact local and production administration origins. Do not use `*` in production. An AWS CLI-compatible example is:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://www.example.com"],
      "AllowedMethods": ["POST"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

Apply and verify it with a separately configured infrastructure profile, replacing the endpoint, bucket, and file paths:

```powershell
aws s3api put-bucket-cors --endpoint-url https://fsn1.your-objectstorage.com --bucket your-catalog-bucket --cors-configuration file://catalog-cors.json
aws s3api get-bucket-cors --endpoint-url https://fsn1.your-objectstorage.com --bucket your-catalog-bucket
```

Abandoned temporary uploads require this storage-level lifecycle safety net. The prefix filter is deliberate and must never be broadened to `catalog/` or `catalog/assets/`:

```json
{
  "Rules": [
    {
      "ID": "expire-catalog-pending-after-two-days",
      "Status": "Enabled",
      "Filter": { "Prefix": "catalog/pending/" },
      "Expiration": { "Days": 2 }
    }
  ]
}
```

Apply and read back the lifecycle configuration:

```powershell
aws s3api put-bucket-lifecycle-configuration --endpoint-url https://fsn1.your-objectstorage.com --bucket your-catalog-bucket --lifecycle-configuration file://catalog-lifecycle.json
aws s3api get-bucket-lifecycle-configuration --endpoint-url https://fsn1.your-objectstorage.com --bucket your-catalog-bucket
```

Verify separately that a test object under `catalog/pending/` expires and that objects under `catalog/assets/` do not match the rule. Application cleanup removes expired upload records and retries deletion tombstones during later media operations; the lifecycle rule guarantees storage cleanup even when no later request occurs.

For local development, use a dedicated non-production S3-compatible bucket or a loopback S3-compatible service and set all six catalog-storage variables. HTTP is accepted only for loopback endpoints outside production. Production endpoints and public bases must use HTTPS. PDF objects are stored with `application/pdf` and attachment disposition; add `X-Content-Type-Options: nosniff` at the CDN or reverse-proxy layer if the direct object service cannot emit it.

Migration order is: review and apply the committed database migration, configure bucket read policy/CORS/lifecycle, deploy server-only credentials, and then deploy the application. Never commit credentials. For a future S3-compatible provider, copy `catalog/assets/*` with identical keys and change the endpoint, region, bucket, public base, and credentials. Pending uploads should be allowed to expire before cutover. A non-S3 provider requires a new adapter behind the same narrow boundary; catalog schema, editor, and public presentation remain unchanged.

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

## Google OAuth configuration

To enable Google sign-in, set both server-only `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. In Google Auth Platform, complete the Branding details, set the Audience to External, and add intended External test users while the app remains unpublished. Under Data Access, use only the default `openid`, `email`, and `profile` scopes. Register the production authorized domain before adding its redirect URI. Configure these external URLs:

- Local authorized origin: `http://localhost:3000`
- Local redirect URI: `http://localhost:3000/api/auth/callback/google`
- Production authorized origin: the exact HTTPS value of `BETTER_AUTH_URL`
- Production redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`

Redirect URIs must match exactly. Never expose the client secret to browser code. See [Google OAuth setup](https://developers.google.com/identity/protocols/oauth2/web-server) for the provider configuration flow.

## Facebook Login configuration

To enable Facebook sign-in, set both server-only `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET`. In the Meta Developer dashboard:

- Create a Consumer app and add the Facebook Login product.
- Keep the app in Development mode while testing; add each intended developer, administrator, or tester before they try the flow. Switch to Live mode only when the public configuration is complete.
- Request only Facebook Login's default `public_profile` and `email` permissions. A person may still decline email sharing or Facebook may not return an address; sign-in then cannot create or access an account.
- Add the production host to App Domains and configure the Facebook Login **Valid OAuth Redirect URIs** exactly as follows:
  - Local: `http://localhost:3000/api/auth/callback/facebook`
  - Production: `<BETTER_AUTH_URL>/api/auth/callback/facebook`
- Before going live, provide the required public, HTTPS privacy-policy URL and a user-data deletion instruction or callback URL. Ensure their wording accurately describes the data actually processed; this repository does not provide legal wording or a data-deletion feature.

The Facebook App ID and App Secret map to `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` respectively. Redirect URIs must match exactly, and the app secret must remain server-only. See [Better Auth's Facebook provider documentation](https://better-auth.com/docs/1.6/authentication/facebook) and Meta's [privacy-policy requirements](https://developers.meta.com/vr/policy/privacy-policy/) before publishing the app.

## Available validation commands

These commands perform static checks and do not start the application:

```powershell
npm run auth:check
npm run typecheck
npm run lint
```
