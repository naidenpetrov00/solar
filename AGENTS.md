# AGENTS.md

## Project

This repository contains a public solar-installation marketing website.

The website should help visitors understand solar solutions, explore suitable options, build trust in the company, and convert into qualified leads.

The site should be useful both for visitors arriving organically and for visitors coming from paid advertising.

The experience should guide users naturally from interest to understanding to action without forcing a rigid funnel where a better UX is possible.

## Tech

* Next.js
* App Router
* TypeScript
* Tailwind CSS
* Vercel deployment

Use the project's installed versions and existing conventions.

Internationalization requirements are defined in [`.agents/i18n.md`](.agents/i18n.md). Read and follow that file for all localization, locale routing, translated content, metadata, SEO, and language-switching work.

## Engineering Principles

* Reuse existing components and patterns before introducing new ones.
* Use Server Components by default where appropriate.
* Use Client Components only when interaction requires them.
* Keep business logic separate from presentation logic.
* Keep reusable business and marketing data easy to locate and modify.
* Do not hard-code secrets or environment-specific values.
* Preserve existing architecture unless there is a clear reason to change it.
* Build reusable infrastructure only when there is an actual repeated need.

## Product Direction

This is primarily a lead-generation and service website, not an e-commerce store.

The site should make solar installation easier for a potential customer to understand.

Important concepts may include:

* understanding customer energy needs;
* presenting suitable solar solutions;
* transparent packages or indicative pricing;
* completed installations and proof of work;
* equipment and service information;
* consultation or quote requests.

These are product directions, not rigid implementation requirements.

Prefer the solution that creates the clearest and simplest user experience.

## Marketing

The website should be suitable for traffic from:

* Google Ads;
* Meta / Facebook / Instagram Ads;
* organic search;
* direct and referral traffic.

Pages should have:

* a clear purpose;
* understandable value proposition;
* sensible CTA hierarchy;
* strong message consistency;
* appropriate trust signals;
* minimal unnecessary friction.

Campaign-specific landing pages may be created when they improve relevance and conversion.

Do not use misleading claims, fake urgency, fabricated testimonials, manipulative patterns, or unsupported performance claims.

Use the `marketing-website` skill for conversion, paid-ad, analytics, attribution, and consent-related decisions.

## SEO

SEO should be considered part of the site architecture, not added as an afterthought.

Maintain:

* semantic and crawlable page structure;
* meaningful page hierarchy;
* clean URLs;
* appropriate metadata;
* sensible internal linking;
* support for service-specific and local-intent pages where genuinely useful.

Do not create thin, duplicated, or keyword-stuffed pages merely to target search terms.

Content should primarily serve users.

Use dedicated SEO guidance when available.

## Analytics and Advertising

The architecture should remain compatible with:

* Google Tag Manager;
* GA4;
* Google Ads conversion tracking;
* Meta Pixel;
* future server-side or enhanced tracking when explicitly required.

Keep vendor-specific tracking isolated from business UI.

Track meaningful business actions rather than arbitrary interface interactions.

Do not add analytics IDs, advertising credentials, or vendor integrations unless requested.

## Privacy and Consent

Assume the website may serve users in Bulgaria and the European Economic Area.

Marketing and analytics implementations should remain compatible with consent-aware tracking.

Do not treat technical implementation as legal advice.

Do not invent privacy or legal wording.

## Performance

The website should remain fast, especially on mobile and for paid-ad traffic.

Avoid unnecessary:

* client-side JavaScript;
* large dependencies;
* heavy media;
* third-party scripts;
* layout instability.

Use dedicated framework and performance guidance where available.

## Accessibility

Do not sacrifice accessibility for design or conversion.

Interactive elements, navigation, forms, and dialogs should remain usable with keyboards and assistive technologies.

Use dedicated accessibility guidance when available.

## Content Integrity

Do not invent business facts.

This includes:

* prices;
* warranties;
* certifications;
* company statistics;
* completed-project results;
* customer savings;
* testimonials;
* equipment specifications presented as company commitments.

When real information is unavailable, use clear placeholders or ask for data when appropriate.

## Design

* The visual direction should be **modern, premium, distinctive, and intentionally designed**, not generic SaaS/AI-template styling.
* Avoid common “AI slop” patterns such as excessive gradient blobs, generic glass cards everywhere, random neon accents, repetitive rounded cards, and visually empty sections.
* Use a **dark + white visual system** as the main design language.
* Prefer strong contrast, clean typography, precise spacing, large confident sections, and deliberate composition.
* The site should feel suitable for a serious technical/energy company while still being visually memorable.
* Use `impeccable` for visual design, polish, composition, spacing, typography, interaction, and motion decisions.
* Do not let structural implementation predefine the final visual style too tightly.
* Use animation and motion intentionally so the site feels alive rather than static.
* Good candidates include:

  * section reveals;
  * subtle scroll-driven transitions;
  * animated counters or energy metrics;
  * smooth calculator/result transitions;
  * package-card interactions;
  * image transitions;
  * hover states;
  * subtle background motion;
  * micro-interactions on important CTAs and controls.
* Motion should reinforce hierarchy and interaction, not exist only for decoration.
* Respect reduced-motion preferences.
* Prefer a few strong visual moments over animation on every element.
* Use real project photography and technical imagery as important parts of the design when available.
* The website should not feel like a static collection of rectangular sections stacked vertically; use varied composition, visual rhythm, overlap, scale, whitespace, imagery, and motion where appropriate.

## Responsive / Mobile

* Design **mobile and desktop together from the beginning**. Mobile must not be treated as a reduced desktop version added afterward.
* All important features and user journeys must provide the same core functionality on mobile and desktop.
* Responsive behavior should be considered while components are being designed, not patched later with breakpoints.
* Prioritize:

  * readable typography;
  * comfortable touch targets;
  * simple navigation;
  * usable calculator inputs;
  * clear package comparison;
  * short and easy forms;
  * visible CTAs;
  * appropriately sized imagery;
  * smooth animations on lower-powered devices.
* Desktop layouts may use richer composition, wider spacing, larger imagery, and more advanced motion, but the underlying experience must remain coherent on mobile.
* Do not hide important content or functionality on mobile merely because it is harder to lay out.
* Avoid horizontal scrolling unless it is an intentional interaction pattern.
* Interactive elements should be designed for touch first where appropriate.
* Test components at multiple viewport sizes during implementation.
* Motion and visual effects should degrade gracefully on smaller screens and slower devices.
* Preserve strong performance and Core Web Vitals on mobile, especially because much of the paid-ad traffic may arrive there.


## Skills

Use relevant skills when available.

Core skills may include:

* next-best-practices
* vercel-react-best-practices
* web-accessibility
* marketing-website
* copywriting
* impeccable
* and more in the .agents/skills folder

Apply specialized skills only when relevant to the current task.

If repository context and applicable skills leave an unresolved or version-sensitive technical gap, or the local implementation uses questionable, stale, or legacy patterns, consult Context7 when it is available and retrieve only the missing information. Use web search only as the final permitted fallback when Context7 is unavailable or inadequate and current external information is still necessary.

## Task Discipline

Do not run tests, production builds, development servers, previews, or the application itself unless the user explicitly requests it. This includes commands such as `npm test`, `npm run build`, `npm run dev`, and equivalent package-manager commands. Static inspection and code changes are allowed without running them.

For each task:

1. Inspect the relevant existing implementation first.
2. Understand the requested outcome before making changes.
3. Make the smallest coherent change that solves the problem.
4. Preserve working architecture and conventions.
5. Avoid speculative infrastructure for hypothetical future requirements.
6. Keep future extension possible without designing the entire future system now.
7. When several approaches are valid, prefer the simpler one that follows established project patterns.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
