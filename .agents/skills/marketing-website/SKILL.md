---
name: marketing-website
description: Plan, implement, or audit lead-generation and paid-acquisition behavior on public websites, including landing-page conversion paths, CTA hierarchy, forms, business events, campaign attribution, and consent-aware analytics. Use when conversion, paid traffic, or measurement is in scope; not for general site building, visual design, SEO-only work, campaign creative or targeting, or framework mechanics.
---

# Marketing Website

Improve the path from visitor intent to a meaningful business conversion and make that path measurable without coupling the interface to advertising vendors.

## Boundaries

This skill owns landing-page conversion strategy, offer and CTA hierarchy, lead flows, paid-ad-to-page message match, business-event design, campaign attribution, consent-aware analytics architecture, and reviews prioritized by business impact.

Use dedicated skills for detailed SEO, accessibility, visual design, framework architecture, React performance, ad creative, and programmatic page generation. Do not use this skill for campaign targeting, bidding, or budget management.

## Start With the Business Outcome

Before changing or assessing a page:

1. Identify the primary business conversion and any legitimate secondary conversions.
2. Understand the visitor intent and likely traffic source.
3. Inspect the page, conversion path, forms, analytics boundary, attribution handling, and consent behavior.
4. Reuse the project's existing architecture and conventions.
5. Limit changes to the requested marketing outcome.

If campaign context, runtime behavior, vendor configuration, or conversion data is unavailable, state the resulting verification gap instead of inventing it.

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

## Paid-Traffic Readiness

- Preserve message match between the ad and landing page.
- Align the page with the campaign's visitor intent.
- Provide a focused, fast mobile path to a meaningful conversion.
- Capture only useful campaign attribution.
- Keep Google Ads, Meta, and other vendor code behind a shared tracking boundary.
- Leave room for server-side or enhanced-conversion integrations without building them speculatively.

This skill governs the landing page and measurement layer, not ad copy, creative formats, audiences, bidding, or campaign operations.

## Analytics and Tracking Architecture

Use a small event boundary when repeated tracking needs justify it. UI code should emit stable events describing business outcomes; vendor loading and mapping should remain isolated from page components.

### Preferred architecture

Business interaction
→ business event
→ tracking boundary
→ GTM / analytics vendor

Use Google Tag Manager as the central tag layer only when it fits the existing project. Do not scatter GTM, GA4, Google Ads, Meta Pixel, or other vendor scripts throughout page and component code.

### Event quality

Track an interaction only when it answers a useful business question. Useful events can include:

- `calculator_started`
- `calculator_completed`
- `package_viewed`
- `package_selected`
- `quote_started`
- `quote_submitted`
- `phone_clicked`
- `email_clicked`
- `appointment_requested`

Do not turn incidental UI activity into analytics noise.

## Attribution

Preserve only the attribution required by the measurement flow.

Support relevant campaign values such as:

- UTM parameters;
- landing page;
- referrer;
- campaign identifiers where applicable.

Attach useful and permitted attribution to a submitted lead when the business process needs it.

Do not create unnecessary persistent tracking storage.

## Lead Forms

Ask only for information required to qualify or fulfill the lead. Forms need:

- only fields needed for the business process;
- clear labels and instructions;
- clear success state;
- clear error state;
- meaningful validation;
- mobile-friendly controls;
- an accessible keyboard and assistive-technology experience.

Carry forward useful information already supplied through a calculator, package selector, configurator, or earlier step instead of asking for it again.

Useful lead context can include:

- selected service;
- selected package;
- calculator result;
- location;
- campaign attribution;
- requested survey;
- business/home customer type.

Do not collect personal information on the possibility that it might be useful later.

## Consent and Privacy

When the target market includes Bulgaria or the European Economic Area, design tracking around the site's approved consent model.

Keep the architecture compatible with:

- cookie consent management;
- Google Consent Mode;
- analytics consent;
- advertising consent.

Ensure analytics and advertising tags respect the applicable consent state.

Avoid collecting or forwarding personal information unless it is:

1. necessary;
2. explicitly requested by the implementation;
3. compatible with the site's privacy and consent handling.

Enhanced conversions may involve personal information.

Implement them only when explicitly in scope and when the required consent and privacy design is established.

Separate technical implementation from legal advice.

Do not:

- invent privacy-policy text;
- claim GDPR compliance automatically;
- present technical measures as legal advice.

Flag where approved legal wording or a legal decision is required.

## Cross-Domain Guardrails

Marketing work must not:

- damage crawlability or create unnecessary duplicate organic pages;
- degrade mobile performance with excessive scripts, media, or overlays;
- make navigation, forms, dialogs, validation, or consent controls less accessible;
- override the project's framework and component conventions.

Apply the relevant dedicated skill when work requires a detailed SEO, performance, accessibility, framework, or design decision.

## Scope and Implementation Discipline

- Keep vendor integrations isolated from business UI.
- Avoid duplicate analytics layers.
- Do not build speculative CRM, Conversions API, or server-side tracking infrastructure.
- Add reusable marketing infrastructure only for a demonstrated repeated need.
- Preserve existing architecture unless the marketing requirement makes a change necessary.

## Review Mode

Report findings in descending order of business impact.

For each finding:

1. identify the observed evidence;
2. explain the affected conversion, measurement issue, or business risk;
3. distinguish a defect from an optional experiment;
4. recommend a proportionate change;
5. state any verification gap.

Evaluate:

1. conversion path and mobile lead flow;
2. offer, CTA, trust, and ad-to-page message match;
3. form friction and lead quality;
4. business events, attribution, and vendor isolation;
5. consent and privacy-sensitive data flows;
6. paid-traffic readiness.

Do not present stylistic preferences as conversion findings. Use observed behavior or data when available, and label hypotheses that still require testing.
