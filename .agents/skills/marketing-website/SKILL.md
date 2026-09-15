---
name: marketing-website
description: Build or review public business websites and paid-ad landing pages for conversions, Google Ads, Meta Ads, GA4, GTM, consent-aware tracking, technical SEO, performance, and accessibility. Use for marketing readiness and lead-generation behavior, not visual styling alone.
---

# Marketing Website

Build or review public business websites so paid traffic can reach a clear offer, complete meaningful lead actions, and be measured accurately. Apply the principles framework-independently; in Next.js projects, use the project's installed version and native features.

## Start With the Business Outcome

Before changing or assessing a page:

1. Identify the primary business conversion and any legitimate secondary conversions.
2. Inspect the relevant project structure, existing components, analytics, consent handling, metadata, and deployment assumptions.
3. Reuse the project's architecture and conventions.
4. Make only the changes needed for the requested marketing outcome.

Meaningful conversions can include `contact_form_submitted`, `quote_requested`, `phone_clicked`, `email_clicked`, `whatsapp_clicked`, `messenger_clicked`, `viber_clicked`, `appointment_requested`, `site_survey_requested`, and other business-specific lead actions. Choose stable event names that describe business outcomes rather than UI mechanics.

## Conversion Structure and Landing Pages

Design around a sensible path from visitor intent to conversion, not page views or engagement for its own sake.

- Make the offer and primary CTA immediately understandable.
- Keep message and offer consistent with the referring Google or Meta ad.
- Add relevant trust signals and make important contact actions easy to reach.
- Optimize first for mobile users and fast loading.
- Keep forms as short as reasonably possible for the lead-quality needs.
- Reduce navigation and distractions on campaign landing pages when that supports the conversion path.
- Keep the experience clean, professional, and accessible.

Do not use misleading claims, manipulative patterns, excessive popups, banners, repeated CTAs, gratuitous animation, or other conversion tricks.

## Analytics and Advertising Architecture

Prefer a small event-based boundary between business UI and marketing vendors when repeated tracking needs justify it. UI code should emit meaningful business events; vendor-specific mapping and loading should remain isolated.

- Prefer Google Tag Manager as the central tag layer when it suits the existing architecture.
- Keep GTM integration simple and localized.
- Make events usable by GA4 and relevant conversion destinations without generating events merely because they are possible.
- Preserve UTM parameters and attribution data only as needed for the requested measurement flow.
- Support campaign-specific landing pages without coupling page components to Google Ads or Meta implementation details.
- Keep Meta Pixel concerns separate from application business logic and leave room for a future Conversions API integration without building it prematurely.
- Do not independently scatter GTM, GA4, Google Ads, Meta Pixel, or other vendor scripts through components unless the project has a strong documented reason.

Enhanced conversions may involve personal information. Implement them only when explicitly requested and when the required consent and privacy design is established.

Use current official Google, Meta, analytics, and framework documentation when behavior or APIs may have changed. Do not rely on remembered or outdated tracking conventions.

## Consent and Privacy

Assume sites targeting Bulgaria or the European Economic Area need consent-aware tracking architecture.

- Keep the implementation compatible with cookie consent management, Google Consent Mode, analytics consent, and advertising consent.
- Ensure analytics and advertising tags respect the user's consent state where required.
- Avoid collecting or forwarding personal information unless it is necessary, explicitly requested, and covered by the required consent/privacy handling.
- Separate technical implementation from legal advice.

Do not invent policy text, present technical measures as legal advice, or claim GDPR compliance automatically. Flag where approved legal wording or a legal decision is required.

## SEO, Performance, and Accessibility

Maintain strong technical foundations while pursuing conversions.

### SEO

- Use semantic, crawlable HTML and a correct heading hierarchy.
- Provide unique page titles, useful meta descriptions, clean URLs, and appropriate internal links.
- Add canonical URLs and Open Graph metadata where relevant.
- Provide correct sitemap and robots behavior.
- Add structured data only when it truthfully represents the business or page content.
- For local service businesses, use relevant local-business patterns when supported by real business information.

Do not keyword-stuff content or add metadata and schema solely for volume.

### Performance

- Protect Core Web Vitals, mobile performance, and layout stability.
- Optimize images and font loading.
- Minimize client-side JavaScript and the cost of third-party scripts.
- Do not introduce a large dependency for a small problem.

### Accessibility

Use semantic markup and accessible interaction patterns. Navigation, forms, buttons, links, validation, and other controls must work with keyboards and assistive technologies. Do not trade accessibility for visual design or conversion pressure.

## Next.js Projects

Before writing Next.js code, read the relevant documentation for the installed version under `node_modules/next/dist/docs/` and heed repository guidance and deprecations. Do not assume APIs or conventions from another Next.js version.

Prefer native Next.js capabilities when they are the simplest correct choice, including:

- the Metadata API;
- static generation or server rendering according to the page's data needs;
- optimized images;
- native sitemap and robots support.

Keep components server-rendered by default. Add client-side JavaScript only for behavior that requires it, and do not add server infrastructure when static functionality is sufficient.

## Scope and Implementation Discipline

This skill governs marketing structure, conversion paths, analytics, advertising readiness, consent-aware technical design, SEO, performance, and accessibility. It is not primarily a visual-design skill. When a design skill is available, let it govern visual polish; let framework-specific guidance govern framework mechanics.

- Prefer the simplest correct implementation.
- Add no unrelated functionality, speculative integrations, unnecessary validation, wrappers, services, or utility layers.
- Create reusable infrastructure only for a clear repeated use case.
- Keep vendor integrations isolated from business UI and preserve maintainability.
- Verify that the result does not unnecessarily harm SEO, performance, privacy, or accessibility.

## Review Mode

When reviewing an existing site, inspect the implementation and report findings in descending order of actual business impact. For each finding, explain the affected conversion or risk and give a concrete, proportionate recommendation.

Evaluate:

1. conversion path and CTA clarity;
2. suitability and message consistency for paid-ad landing pages;
3. mobile usability;
4. meaningful analytics events and vendor isolation;
5. Google Ads and Meta Ads readiness, including attribution;
6. consent handling and privacy-sensitive data flows;
7. technical SEO;
8. Core Web Vitals and performance risks;
9. accessibility;
10. unnecessary implementation complexity.

Do not recommend changes solely from stylistic preference. Distinguish observed defects from optional improvements and call out important verification gaps when runtime data, vendor configuration, consent policy, or legal wording is unavailable.
