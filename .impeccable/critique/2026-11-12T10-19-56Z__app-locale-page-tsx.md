---
target: началната страница
total_score: 16
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\naide\\dev\\solar\\app\\[locale]\\page.tsx"
target_fingerprint: "sha256:ed623a3c79bfee34d90b819b8907d1d9a7724f65c1e6bd501e1ccf5c4077d41d"
target_path: "C:\\Users\\naide\\dev\\solar\\app\\[locale]\\page.tsx"
timestamp: 2026-11-12T10-19-56Z
slug: app-locale-page-tsx
closed: true
---
# UI critique: Homepage foundation

## Summary

The visual language is recognisable and coherent: full-bleed solar photography, strong editorial typography, near-black surfaces, restrained yellow, and structural borders. The main weakness is the interaction hierarchy. The first screen makes the secondary destinations easier to reach than the primary Home/Business choice, while the same four destinations are repeated immediately below. The result feels more like a large site index than a clear marketing gateway.

## Heuristic assessment

Score: 16/24 applicable points. Overall: acceptable foundation, but the primary decision path needs redesign before later pages build on it.

- Visibility of system status: 3/3
- Match with the real world: 3/3
- User control and freedom: 3/3
- Consistency and standards: 3/3
- Recognition rather than recall: 2/3
- Aesthetic and minimalist design: 2/3
- Error prevention, flexibility, error recovery, and help: not applicable to this static homepage foundation

## Findings

### P1 — Primary Home/Business choice falls below the fold

At 1536×864 the hero is about 966px tall and the Home/Business row starts near y=845. At the inspected 1101×830 viewport the hero is about 840px tall and the lower part of that row is clipped. On mobile 390×667, Business starts below the first viewport. The hero combines a tall header, a six-line headline, supporting copy, a secondary Maintenance/Shop row, and the primary Home/Business row.

Recommendation: make the hero a literal dual gateway that fits inside the available viewport below the header. Put Home and Business at the centre of the composition, and demote Maintenance and Shop to a compact utility row. Use a bounded `100svh` layout without a minimum height that can force overflow.

### P1 — Desktop navigation is overfull and wraps Bulgarian labels

“За дома” and “За бизнеса” wrap even on a wide desktop. The header contains the brand, five public links, four locale codes, theme, cart, sign-in, sign-up, and Contact. It competes with the hero for attention and makes the most important audience labels look broken.

Recommendation: prevent wrapping, switch to the compact navigation earlier, and reduce visible header controls. A single locale disclosure and a consolidated account affordance would preserve functionality while freeing room. Contact should remain the only prominent yellow header action.

### P2 — Headline is too large and too long for a gateway

The current message becomes six large lines and consumes most of the first viewport. It explains three capabilities before the visitor can choose the relevant path.

Recommendation: use a shorter display message such as “Соларни решения за дома и бизнеса.” and move “Изграждане · оборудване · поддръжка” into the supporting line. This is concise without inventing a business claim.

### P2 — Duplicate destination architecture

The hero presents Maintenance, Shop, Home, and Business, then the next section presents the same four choices again. This raises cognitive load and slows the path to useful detail.

Recommendation: let the hero own the audience decision. If the four-direction section remains, make it an explanatory overview with tighter rows and richer context, not a second set of equally dominant navigation gates.

### P2 — Excessive vertical whitespace reduces information density

The Home/Business direction cards and the process section use large minimum heights. During normal scrolling, substantial portions of the viewport are nearly empty, and related content is separated across multiple screens.

Recommendation: reduce section and card minimum heights, align content vertically within intentional editorial bands, and keep each process group readable as a complete unit. Large whitespace should frame content, not separate labels from their explanations and actions.

### P2 — Motion delays important content

The entrance sequence gives the background image a long reveal and delays the primary gate. The motion is visually noticeable but does not help the visitor complete the initial choice.

Recommendation: keep the photograph stable, reveal the headline in roughly 450–600ms, and follow with the gate after 100–150ms. Avoid scroll blur and ensure `prefers-reduced-motion` keeps the content immediately available.

## Strengths to preserve

- Distinctive solar visual world rather than generic rounded marketing cards.
- Coherent palette, typography, dividers, and CTA treatment.
- Clear, factual copy without fabricated prices, savings, or credentials.
- Keyboard-sized controls, semantic links, and reduced-motion support.
- The final contact transition is visually clear and uses the yellow accent appropriately.

## Recommended hero direction

Use a literal “Horizon Gate” composition. On desktop, place a compact headline and supporting line on the left and two equal, unmistakable Home/Business thresholds on the right. The thresholds can be editorial panels rather than conventional buttons: large label, one concise description, directional arrow, and a restrained hover/keyboard state. Place Maintenance and Shop in a slim utility strip at the bottom of the hero. On mobile, stack the compact headline, Home, Business, then the two utility links, all within or immediately at the edge of the first viewport.

## Questions

1. Should the four-direction section remain as a detailed overview after the hero, or should the next section advance directly to the process/trust story?
2. Do we approve the shorter hero message, or should the existing wording remain and only its scale change?
