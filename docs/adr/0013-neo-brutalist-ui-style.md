# ADR-0013: Neo-brutalist visual style for the web app

- **Status:** Accepted · 2026-09-24
- **Deciders:** Golam Mahadi Ahmed (product owner request)
- **Related:** NFR-USA-01…06, D-25, [ADR-0012](0012-frontend-nextjs-tanstack-query-tailwind.md), [Architecture §10](../ARCHITECTURE.md#10-frontend-architecture)

## Context

The web app has a small number of screens for two roles. It must be:
- clear at a glance on a 360 px phone, where ride status matters most (NFR-USA-02, NFR-USA-05);
- accessible: labelled controls, visible keyboard focus, and enough contrast (NFR-USA-05);
- quick to build and easy to change for someone new to the code.

It should also look recognisable, not like an unstyled template.

## Options considered

| Option | For | Against |
|---|---|---|
| Minimal Tailwind utilities, no defined style | Nothing to learn | Each screen drifts; the product has no identity |
| A component library (MUI, shadcn/ui) | Many ready-made parts | Extra dependency and bundle; a generic look; theming work to make it our own |
| **Neo-brutalism** on Tailwind tokens | High contrast by design; few, simple rules; a distinctive look; flat colours and hard edges are easy to build with plain CSS | A bold look that not everyone likes; needs discipline so that colour is never the only signal |

## Decision

Use a neo-brutalist style, defined once as Tailwind theme tokens in `apps/web/src/app/globals.css` and applied only through the shared components in `apps/web/src/components/ui/`.

- **Borders and shadows:** a 3 px solid black border on every card, button, input and badge, and a hard offset shadow `4px 4px 0 #000` with no blur. A pressed button moves 4 px and loses its shadow.
- **Colours:** flat, no gradients, on an off-white page `#FFFDF5`.

  | Colour | Hex | Used for |
  |---|---|---|
  | Yellow | `#FFD23F` | primary actions |
  | Pink | `#FF6B9D` | fees and warnings |
  | Cyan | `#3EC1D3` | information |
  | Lime | `#A3E635` | success |
  | Red | `#FF4D4D` | errors |

  Text is always black.
- **Type:** Archivo Black for headings and Space Grotesk for body text, loaded with `next/font`. Button and badge labels are in capitals.
- **Shapes:** square corners (0–4 px), blocky layout, generous spacing.
- **Status badges:** REQUESTED is cyan, MATCHED and DRIVER_ARRIVED are yellow, STARTED is pink, COMPLETED is lime, and CANCELLED and EXPIRED are grey. Every badge also shows a text label, so colour is never the only signal.
- **Accessibility rules:**
  - black text on every accent colour, which gives a contrast of at least 4.5:1;
  - a thick, visible focus outline on everything that can receive focus;
  - every form control has a `<label>`.
- **One-place changes:** pages never style raw HTML elements for the look. They use the `components/ui` kit, so changing a token or a component changes every screen.

## Consequences

- **+** Contrast and focus visibility come from the style itself, not from extra work per screen.
- **+** The look is consistent and recognisable, with no component-library dependency.
- **+** A new contributor learns about ten components and a handful of tokens.
- **−** Bold borders and shadows take space; layouts must stay simple at 360 px.
- **−** The style is opinionated. Changing it later means editing the tokens and the kit, but not the pages.

## Revisit when

The app needs dense data views, such as operator dashboards, where heavy borders would cost too much space. A second product surface would also need its own visual language.
