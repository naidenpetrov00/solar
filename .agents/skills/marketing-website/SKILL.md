---
name: marketing-website
description: Build or review public business websites and paid-ad landing pages for conversions, Google Ads, Meta Ads, GA4, GTM, attribution, consent-aware tracking, and lead-generation behavior. Use for marketing readiness and conversion structure, not framework mechanics, visual styling, or general accessibility implementation.
---

# Marketing Website

Build or review public business websites so paid traffic can reach a clear offer, complete meaningful lead actions, and be measured accurately.

This skill focuses on marketing structure, conversion paths, paid-ad readiness, analytics architecture, attribution, consent-aware tracking, and business-impact review.

Let dedicated framework, performance, accessibility, SEO, copywriting, and visual-design skills govern their respective areas when available.

## Start With the Business Outcome

Before changing or assessing a page:

1. Identify the primary business conversion and any legitimate secondary conversions.
2. Understand the visitor intent and likely traffic source.
3. Inspect the relevant page structure, lead forms, analytics, consent handling, and current conversion path.
4. Reuse the project's existing architecture and conventions.
5. Make only the changes needed for the requested marketing outcome.

Meaningful conversions can include:

- `contact_form_submitted`
- `quote_requested`
- `phone_clicked`
- `email_clicked`
- `whatsapp_clicked`
- `messenger_clicked`
- `viber_clicked`
- `appointment_requested`
- `site_survey_requested`
- `calculator_completed`
- `package_selected`

Choose stable event names that describe business outcomes rather than UI mechanics.

Do not create tracking events merely because an interaction exists.

## Conversion Structure and Landing Pages

Design around a sensible path from visitor intent to conversion.

Typical flow:

Ad / Search Intent
→ Relevant Landing Page
→ Clear Offer
→ Useful Information or Tool
→ Trust
→ CTA
→ Lead

### Core principles

- Make the offer and primary CTA immediately understandable.
- Keep message, offer, and terminology consistent with the referring Google or Meta ad.
- Match landing-page intent to the campaign or search term where practical.
- Give visitors enough information to make the next decision without unnecessary friction.
- Make important contact actions easy to reach.
- Keep forms as short as reasonably possible for the required lead quality.
- Prefer giving useful value before asking for personal information when that suits the funnel.
- Optimize conversion flows primarily for mobile paid traffic.
- Reduce navigation and distractions on campaign landing pages when that supports the conversion goal.
- Reuse existing site sections instead of duplicating entire landing-page implementations.

Do not use:

- misleading claims;
- fake scarcity;
- fake urgency;
- deceptive countdowns;
- manipulative patterns;
- excessive popups;
- repeated intrusive CTAs;
- fabricated testimonials;
- unsupported savings or performance claims;
- gratuitous animation intended only to force attention.

## Offer and CTA Strategy

Every important page should have a clear primary action.

Examples:

- calculate a system;
- request a quote;
- schedule a survey;
- call the business;
- send a message;
- select a package.

Secondary actions may exist, but they should not compete unnecessarily with the primary conversion.

CTA text should describe the visitor's next action or expected result rather than using vague wording when a more specific phrase is available.

Examples:

Prefer:

- "Calculate your system"
- "Request an offer"
- "Book a site survey"

Over generic wording such as:

- "Submit"
- "Learn more"

Do not add CTAs solely to increase their count.

## Paid Advertising Readiness

Prepare pages so they can support traffic from:

- Google Ads;
- Meta / Facebook / Instagram Ads;
- other paid channels when requested.

### Google Ads

Support:

- campaign-specific landing pages;
- strong message match between ad and page;
- relevant conversion actions;
- clean attribution;
- fast mobile experience;
- clear offer and trust signals.

### Meta Ads

Support:

- focused mobile landing experiences;
- clear lead actions;
- campaign attribution;
- Meta Pixel integration boundaries;
- future Conversions API integration without prematurely building it.

Do not couple business UI directly to Google Ads or Meta-specific implementation details.

## Analytics and Tracking Architecture

Prefer a small event-based boundary between business UI and marketing vendors when repeated tracking needs justify it.

UI code should emit meaningful business events.

Vendor-specific loading and mapping should remain isolated.

### Preferred architecture

Business interaction
→ marketing event
→ tracking boundary
→ GTM / analytics vendor

Prefer Google Tag Manager as the central tag layer when it suits the existing project.

Keep integrations localized and simple.

Avoid independently scattering:

- GTM;
- GA4;
- Google Ads;
- Meta Pixel;
- other vendor scripts

through page and component code unless the project has a strong documented reason.

### Event quality

Track events that answer useful business questions.

Examples:

- calculator started;
- calculator completed;
- package viewed;
- package selected;
- quote started;
- quote submitted;
- phone clicked;
- email clicked.

Avoid tracking meaningless UI noise.

## Attribution

Preserve campaign attribution only as needed for the requested measurement flow.

Support relevant campaign values such as:

- UTM parameters;
- landing page;
- referrer;
- campaign identifiers where applicable.

When a visitor submits a lead, preserve relevant attribution data if it is useful and permitted by the site's privacy and consent model.

Do not create unnecessary persistent tracking storage.

## Lead Forms

Lead forms should support the conversion goal without unnecessary friction.

Prefer:

- only fields needed for the business process;
- clear labels;
- clear success state;
- clear error state;
- meaningful validation;
- mobile-friendly controls.

If the visitor has already provided useful information through a calculator, package selector, configurator, or previous step, pass that information with the lead instead of asking them to enter it again.

Useful lead context can include:

- selected service;
- selected package;
- calculator result;
- location;
- campaign attribution;
- requested survey;
- business/home customer type.

Do not collect personal information merely because it might be useful later.

## Consent and Privacy

Assume sites targeting Bulgaria or the European Economic Area need consent-aware tracking architecture.

Keep the implementation compatible with:

- cookie consent management;
- Google Consent Mode;
- analytics consent;
- advertising consent.

Ensure analytics and advertising tags respect the user's consent state where required.

Avoid collecting or forwarding personal information unless it is:

1. necessary;
2. explicitly requested by the implementation;
3. compatible with the site's privacy and consent handling.

Enhanced conversions may involve personal information.

Implement them only when explicitly requested and when the required consent and privacy design is established.

Separate technical implementation from legal advice.

Do not:

- invent privacy-policy text;
- claim GDPR compliance automatically;
- present technical measures as legal advice.

Flag where approved legal wording or a legal decision is required.

## SEO Awareness

Marketing changes must not unnecessarily damage organic discoverability.

When a dedicated SEO skill is available, let it govern detailed SEO implementation.

For this skill, ensure that:

- campaign landing pages have a clear purpose;
- duplicate landing pages are not created unnecessarily;
- pages remain crawlable when they are intended to rank;
- paid-campaign architecture does not conflict with important organic pages;
- local service intent is reflected where relevant and supported by real business information.

Do not keyword-stuff content or generate location/service pages solely for volume.

## Performance Awareness

Paid traffic should reach a fast, stable experience.

When a dedicated performance or framework skill is available, let it govern implementation details.

Marketing work must avoid unnecessarily degrading:

- mobile loading speed;
- Core Web Vitals;
- layout stability;
- responsiveness.

Be especially cautious with:

- third-party tracking scripts;
- large media;
- unnecessary client-side JavaScript;
- intrusive overlays.

## Accessibility Awareness

Conversion work must not reduce accessibility.

When a dedicated accessibility skill is available, let it govern implementation details.

Do not introduce conversion patterns that make:

- navigation;
- forms;
- buttons;
- links;
- validation;
- dialogs;
- consent controls

harder to use with keyboards or assistive technologies.

Do not trade accessibility for conversion pressure.

## Relationship With Other Skills

When other specialized skills are available, use them for their domain:

- framework skill → framework mechanics and architecture;
- React / performance skill → rendering and performance optimization;
- accessibility skill → WCAG and interaction accessibility;
- SEO skill → detailed technical and content SEO;
- copywriting skill → final marketing copy;
- design skill → visual styling and polish;
- testing skill → automated tests.

This skill remains responsible for:

- conversion strategy;
- landing-page behavior;
- paid-ad message match;
- CTA hierarchy;
- lead flow;
- analytics event strategy;
- attribution;
- Google Ads readiness;
- Meta Ads readiness;
- consent-aware marketing architecture;
- business-impact review.

## Scope and Implementation Discipline

Prefer the simplest correct implementation.

Do not add:

- unrelated functionality;
- speculative integrations;
- unnecessary wrappers;
- unnecessary services;
- duplicate analytics layers;
- premature CRM integrations;
- premature Conversions API infrastructure;
- unnecessary lead fields;
- unnecessary tracking events.

Create reusable marketing infrastructure only for a clear repeated use case.

Keep vendor integrations isolated from business UI.

Respect the project's existing architecture.

## Review Mode

When reviewing an existing site, inspect the implementation and report findings in descending order of actual business impact.

For each finding:

1. explain the affected conversion, measurement issue, or business risk;
2. distinguish an observed defect from an optional improvement;
3. give a concrete and proportionate recommendation;
4. identify important verification gaps.

Evaluate:

1. primary conversion path;
2. offer and CTA clarity;
3. paid-ad message consistency;
4. mobile lead flow;
5. landing-page relevance;
6. form friction;
7. meaningful analytics events;
8. Google Ads and Meta Ads readiness;
9. attribution preservation;
10. vendor isolation;
11. consent handling;
12. privacy-sensitive data flows;
13. trust signals;
14. unnecessary implementation complexity.

Coordinate with dedicated SEO, performance, accessibility, framework, and design skills rather than duplicating their audits.

Do not recommend changes solely from stylistic preference.

Call out important verification gaps when:

- runtime data is unavailable;
- vendor configuration cannot be inspected;
- consent behavior is unknown;
- legal wording has not been approved;
- conversion data is unavailable;
- ad campaign context is missing.
