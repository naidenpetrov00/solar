---
name: Solar
description: Precise solar engineering presented through editorial scale and decisive photography.
colors:
  solar-accent: "#fcd34d"
  solar-accent-hover: "#fde68a"
  technical-ink: "#090b0a"
  warm-paper: "#f4f3ee"
  ink-text: "#11130f"
  pure-white: "#ffffff"
  white-muted: "rgba(255, 255, 255, 0.78)"
typography:
  display:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(2.75rem, 12.5vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(3.5rem, 10vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(1.2rem, 4.8vw, 1.65rem)"
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: "-0.025em"
rounded:
  square: "0"
  control: "6px"
spacing:
  page-mobile: "20px"
  page-desktop: "32px"
  touch-target: "44px"
components:
  destination-rail:
    backgroundColor: "transparent"
    textColor: "{colors.pure-white}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    layout: "three equal vertical zones; the final zone splits Maintenance and Shop equally"
    dividers: "1px translucent white"
    hoverBackgroundColor: "rgba(252, 211, 77, 0.075)"
    minTargetSize: "44px"
  quote-action:
    backgroundColor: "{colors.solar-accent}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
---

# Design System: Solar

## Overview

**Creative North Star: "Horizon Gate"**

Solar uses the visual confidence of engineered infrastructure: decisive photography, near-black and warm-white fields, large typography, and fine dividing rules. Composition is spacious but purposeful, with interaction placed at clear thresholds rather than inside generic cards.

The system should feel premium, technically credible, and direct. Motion is restrained to one authored arrival or transition at a time: hero language resolves sharply from soft focus, then yields quickly as scrolling transfers attention to the next decision. Mobile preserves the same hierarchy and actions instead of reducing the experience.

**Key Characteristics:**

- Full-bleed technical or project photography with deliberate focal points.
- Theme-aware neutral surfaces with yellow reserved for action and focus.
- Editorial type scale, asymmetric composition, and square structural edges.
- Equal clarity and functionality across desktop and mobile.

## Colors

The palette is solar warmth held inside a disciplined monochrome system.

### Primary

- **Solar Signal:** The scarce action color for primary calls to action, focus, and the brand mark.
- **Solar Signal Hover:** A lighter response reserved for interactive hover states.

### Neutral

- **Technical Ink:** The dark-theme field for hero overlays, destination surfaces, and dark navigation.
- **Warm Paper:** The light-theme surface, chosen instead of clinical white for large sections.
- **Ink Text:** The dark text color used on light surfaces and yellow actions.
- **Pure White:** The primary foreground on photography and dark surfaces.
- **White Muted:** Supporting navigation text on dark photographic surfaces.

**The Signal Rarity Rule.** Yellow identifies action or focus; it does not become a decorative wash.

## Typography

**Display Font:** Geist (with Arial, Helvetica, sans-serif fallback)
**Body Font:** Geist (with Arial, Helvetica, sans-serif fallback)

**Character:** A single modern grotesk keeps the system technical and direct. Personality comes from scale, tight-but-readable spacing, and composition rather than ornamental type effects.

### Hierarchy

- **Display:** Large factual hero statements, balanced into a compact measure and capped at 6rem.
- **Title:** Oversized section destinations with minimal surrounding content.
- **Body:** Clear explanatory copy at a conventional reading rhythm when future sections add content.
- **Label:** Destination rails and high-value controls, always action-oriented and comfortably tappable.

**The Plain-Spoken Scale Rule.** Headlines may be monumental, but their language remains factual and immediately understandable.

## Layout

Pages use fluid full-width fields with content constrained to an 80rem reading frame. Desktop compositions may be asymmetric and image-led; below 48rem, hero headlines occupy the upper third while multi-column actions become larger stacked rails lifted above the lower viewport edge. Primary viewports use safe viewport units, and interactive targets remain at least 44px high.

Spacing is generous between major ideas and compact within controls. Full-bleed media carries a separately adjustable focal point for mobile and desktop crops. Content sections inherit the active light or dark theme rather than assigning a theme by audience.

## Elevation & Depth

The system is flat by default. Depth comes from photography, tonal transitions, directional contrast overlays, and overlap—not card shadows or decorative glass.

**The Structural Depth Rule.** Use light, image, and surface changes to create depth; do not add ambient shadows to compensate for weak hierarchy.

## Shapes

Large structural regions and destination rails use square edges and precise one-pixel separators. Small controls may use a restrained 6px radius for touch comfort. Pills are reserved for genuinely compact selectors or status controls.

## Components

### Destination Rails

The Cinematic Gate remains part of the continuous hero photograph rather than becoming a panel or card. On desktop, a thin vertical rule separates the left hero copy from the right Gate. Home and Business occupy two equal structural zones; a third equal-height zone is divided between Maintenance and Shop. Mobile keeps the headline above and the Gate in the lower half of the viewport, preserving the same order and three-zone hierarchy.

All destination regions have transparent default surfaces, square edges, generous internal spacing, white text, directional arrows, and fine translucent one-pixel dividers. Hover and focus may add only a restrained local tint while preserving the photograph. Keyboard focus uses a visible Solar Signal outline, and every destination remains a full-area semantic link with at least a 44px target.

### Destination Sections

Home and Business sections both use the active page theme for their background and foreground. Their distinction comes from asymmetric alignment and spacing, not a forced light-versus-dark audience split.

### Hero Headline Motion

The hero headline uses one short initial upward reveal with controlled clipping, followed by the supporting line and Gate details. It does not depend on scroll position and remains fully resolved after the initial arrival.

The photographic direction scenes use a small client-side IntersectionObserver enhancement. Each scene enters once with a coordinated image wipe, a fixed-duration heading movement from the side of its copy on desktop, and a short delayed reveal for its description and action. Mobile substitutes a compact vertical masked reveal. A scene stops being observed after its first entrance.

Server-rendered images and copy are visible by default. Hidden preparation states are applied only when JavaScript, IntersectionObserver, the required clipping support, and a no-preference motion setting are all available. Unsupported environments and `prefers-reduced-motion` retain an immediately visible, static presentation while hover and keyboard-focus feedback remain available.

### Primary Actions

Primary actions use Solar Signal with Ink Text, a restrained corner radius, and at least a 44px target height. Hover moves to Solar Signal Hover; focus remains explicit and high contrast.

### Navigation

Interior pages use the theme surface. Image-led welcome pages may overlay navigation in white with a directional top fade; an expanded mobile menu becomes an opaque Technical Ink surface for readability. Active states remain restrained and never compete with the page’s primary destination paths.

## Do's and Don'ts

### Do:

- **Do** let one strong photograph carry the visual story and maintain a deliberate mobile crop.
- **Do** use large, concise typography and precise whitespace to establish hierarchy.
- **Do** preserve visible keyboard focus, comfortable touch targets, and reduced-motion behavior.
- **Do** create rhythm through imagery, alignment, and theme-aware surfaces without card grids.

### Don't:

- **Don't** invent prices, savings, guarantees, testimonials, or technical performance claims.
- **Don't** use gradient text, generic glass cards, decorative blobs, or random neon accents.
- **Don't** use rotating copy when a stable factual headline communicates the task more clearly.
- **Don't** hide or demote important paths on mobile.
