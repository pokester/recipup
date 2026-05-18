---
name: Recipup
description: Home dog food cooking assistant. Expert nutrition, warm kitchen.
colors:
  kiln: "#C4614A"
  kiln-light: "#E8957E"
  kiln-deep: "#A8612E"
  kiln-muted: "#F2DDD9"
  garden-shade: "#2D4A3E"
  garden-shade-light: "#4A7A68"
  garden-shade-muted: "#D4E4DF"
  windowsill-sage: "#7A9E7A"
  windowsill-sage-light: "#B5CDB5"
  windowsill-sage-muted: "#E8F0E8"
  set-honey: "#E8BE4B"
  set-honey-light: "#F5DFA0"
  set-honey-muted: "#FBF3D8"
  kitchen-linen: "#FDFAF6"
  oat: "#F7F3ED"
  sand: "#F5EDE0"
  sand-deep: "#ECD9C6"
  inkwell: "#1C1A17"
  ink-dark: "#3D3529"
  ink-mid: "#6A5C4E"
  ink-light: "#A89585"
  ink-faint: "#D4C4B8"
  ink: "#2C2416"
  muted: "#8A7E72"
  subtle: "#C4B9AE"
  border: "#E8E0D6"
  border-strong: "#C4B9AE"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.1
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    letterSpacing: "0.12em"
rounded:
  pill: "9999px"
  card: "1.25rem"
  container: "1.5rem"
  inner: "0.75rem"
  sm: "0.5rem"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
  xl: "3rem"
  2xl: "5rem"
components:
  button-primary:
    backgroundColor: "{colors.kiln}"
    textColor: "{colors.kitchen-linen}"
    rounded: "{rounded.pill}"
    padding: "0.75rem 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.kiln-light}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.75rem 1.5rem"
  button-secondary-hover:
    backgroundColor: "{colors.sand}"
  card-default:
    backgroundColor: "{colors.kitchen-linen}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  card-surface:
    backgroundColor: "{colors.sand}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  chip-balanced:
    backgroundColor: "{colors.windowsill-sage}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0.375rem 0.75rem"
  chip-alert:
    backgroundColor: "{colors.kiln}"
    textColor: "{colors.kitchen-linen}"
    rounded: "{rounded.pill}"
    padding: "0.375rem 0.75rem"
---

# Design System: Recipup

## 1. Overview

**Creative North Star: "The Knowledgeable Friend"**

Recipup's design speaks with the authority of someone who has done the research and the warmth of someone who genuinely cares about your dog. The system never performs expertise, never uses clinical distance as a substitute for confidence, and never deploys warmth as pure decoration. Every token, every surface choice, every spacing decision exists to make the owner feel certain first, then at ease, then quietly proud of the meal they are about to cook.

The palette is kitchen-native: warm whites with the faint hue of dried linen, terracotta accents that echo fired clay and Dutch brick, deep herb-garden greens for surfaces that carry authority. Nothing in this palette could be mistaken for a medical interface or a SaaS analytics product. That is a design constraint, not an aesthetic preference.

Typography pairs Playfair Display with DM Sans: the serif lends authority and warmth to everything that matters emotionally (recipe names, section titles, the dog's name); DM Sans handles instruction, data, and navigation with precision. The two fonts rarely compete. They divide the job with clarity.

**Key Characteristics:**
- Warm-neutral surface hierarchy: kitchen-linen → oat → sand → sand-deep, no grey in the stack
- Playfair Display for all headings (H1–H3), never for labels or data
- Pill-shaped CTAs exclusively; rectangular buttons do not exist in this system
- Two named shadows, used sparingly; tonal surface changes carry most of the depth work
- Kiln (terracotta) at 10% or less of any given screen; its rarity is the point
- Zero glassmorphism, zero gradient text, zero decorative side-stripe borders

## 2. Colors: The Kitchen Palette

A warm-dominant palette grounded in material things: fired clay, garden shade, sage on a windowsill, and late-season honey. No cool greys. No primary-colour primaries.

### Primary
- **Kiln** (`#C4614A`): The terracotta of a fired ceramic vessel and warm brick. Used for all primary CTAs, active indicators, the save action, and coral bullet points. This is the product's single assertive voice. Its rarity is the point.
- **Kiln Light** (`#E8957E`): Button hover state only. Not used at rest.
- **Kiln Deep** (`#A8612E`): Link hover and pressed accent states.
- **Kiln Muted** (`#F2DDD9`): Tinted backgrounds behind coral-adjacent content: vet warnings, supplement amount tags, allergen notices.

### Secondary
- **Garden Shade** (`#2D4A3E`): The depth of an overgrown herb garden. Used for high-weight sections (trust strips, marketing dark surfaces, authority callouts). Never used as a body background in the product app.
- **Garden Shade Light** (`#4A7A68`): Section furniture and informational text on dark surfaces.
- **Garden Shade Muted** (`#D4E4DF`): Subtle tinted backgrounds for "compliant recipe" and coverage states.

### Tertiary
- **Windowsill Sage** (`#7A9E7A`): The grey-green of fresh sage growing in a terracotta pot. Reserved for positive states: complete nutrition coverage, health check-in logged, "mineral-balanced" safety badge. Never used for caution or warning states.
- **Windowsill Sage Light** (`#B5CDB5`): Supporting tone on surfaces and in breed notes.
- **Windowsill Sage Muted** (`#E8F0E8`): Tinted background for positive nutrition and "Built For" dog identity bands.
- **Set Honey** (`#E8BE4B`): The amber-gold of late-season honey. Used for caution and partial states, cost highlights, and waitlist/founding callouts.
- **Set Honey Light** (`#F5DFA0`): Honey supporting tones.
- **Set Honey Muted** (`#FBF3D8`): Tinted backgrounds for cost widgets and partial-coverage nutrition states.

### Neutral
- **Kitchen Linen** (`#FDFAF6`): The warmest near-white. Page background, primary card surface, nav background. Not a pure white; the faint warmth is load-bearing.
- **Oat** (`#F7F3ED`): Second surface layer. Ingredient rows, toggle backgrounds, inset sections.
- **Sand** (`#F5EDE0`): Third surface layer. Softer cards, section alternates, the waitlist block.
- **Sand Deep** (`#ECD9C6`): Densest neutral surface. Image placeholders, the heaviest containers.
- **Inkwell** (`#1C1A17`): Deepest text and heading colour.
- **Ink Dark** (`#3D3529`): Body text and dark-surface headings.
- **Ink Mid** (`#6A5C4E`): Supporting text, secondary labels.
- **Ink Light** (`#A89585`): Meta text, disabled states, tertiary labels.
- **Ink Faint** (`#D4C4B8`): Borders at their lightest.
- **Muted** (`#8A7E72`): General secondary text and placeholder guidance.
- **Subtle** (`#C4B9AE`): Placeholder text in inputs, empty-state labels.
- **Border** (`#E8E0D6`): Default border for all cards and dividers.
- **Border Strong** (`#C4B9AE`): Emphasized borders and secondary button outlines.

**The Kitchen Warmth Rule.** Every neutral in this system is tinted toward the warm ochre-brown hue family. Cold greys (#888888, #CCCCCC, system grey) are prohibited. If a neutral token looks grey when placed next to Kitchen Linen, it is the wrong token.

**The Kiln Rarity Rule.** Kiln appears on no more than 10% of any given screen. It is the product's single assertive voice. When Kiln appears on every button, badge, link, and highlight simultaneously, it loses its authority. Use Garden Shade as a second strong colour where additional weight is needed.

## 3. Typography

**Display Font:** Playfair Display, 600 weight (with Georgia, serif fallback)
**Body Font:** DM Sans (with system-ui, sans-serif fallback)
**Label / Eyebrow:** DM Sans, 600 weight, uppercase, 0.12em letter-spacing

**Character:** The pairing works as authority and instruction. Playfair carries the parts that matter emotionally: the dog's name, the recipe name, the major section title. DM Sans carries data, navigation, and operational guidance. The two never compete because they never appear at the same size doing the same job.

### Hierarchy
- **Display** (Playfair 600, `clamp(2rem, 5vw, 3.75rem)`, line-height 1.1): Hero headlines and the primary welcome greeting. One per page.
- **Headline** (Playfair 600, `clamp(1.75rem, 3vw, 2.5rem)`, line-height 1.2): Major section headings: "Your kitchen", "On the menu today", dashboard section titles.
- **Title** (Playfair 600, `1.5rem`, line-height 1.3): Recipe names, dog names in cards, and subsection headings.
- **Body** (DM Sans 400, `1rem`, line-height 1.65): All descriptive text, instructions, and supporting copy. Line length capped at 65–75ch.
- **Label / Eyebrow** (DM Sans 600, `0.7rem`, letter-spacing `0.12em`, uppercase): Section markers, metadata tags ("STEP 1", "BUILT FOR", nutrition stat labels). At most one per visual group.

**The Serif Boundary Rule.** Playfair Display is for content that carries emotional or nutritional weight: headings, dog names, recipe names. It is prohibited in navigation links, data readouts, error messages, labels, or instructional body text. The sole exception: oversized serif step-numbers in recipe instructions, used at reduced opacity. If Playfair appears anywhere else below heading level, it is wrong.

## 4. Elevation

Recipup uses tonal surface layering as its primary depth signal, not shadows. The four surface tones (kitchen-linen → oat → sand → sand-deep) create hierarchy through warmth and contrast rather than physical lift. Most surfaces are flat at rest.

Two shadows exist and are used sparingly:

### Shadow Vocabulary
- **Card Ambient** (`0 2px 12px 0 rgba(28, 26, 23, 0.07)`): Present on all resting cards. Barely visible. Its function is to separate a warm-white card from a warm-white page background, not to suggest elevation.
- **Card Lift** (`0 8px 32px 0 rgba(28, 26, 23, 0.12)`): Applied on hover or to elements that genuinely sit above the page. Used only when a surface needs to communicate "pickable" or "in focus".

**The Flat-By-Default Rule.** Shadows are never decorative. A card with no interactivity gets Card Ambient. A card with hover behaviour gets Card Lift on hover only. Nothing gets Card Lift at rest. Side-stripe `border-left` accents greater than 1px are prohibited as substitutes for elevation signals; use full borders, background tints, or nothing.

## 5. Components

### Buttons

Tactile and direct. Pill shape, no exceptions. They feel solid, they respond immediately, and they do not suggest that clicking them is optional.

- **Shape:** Full pill (`border-radius: 9999px`). No rounded-lg, no rectangles.
- **Primary:** Kiln background (`#C4614A`), Kitchen Linen text. Padding `0.75rem 1.5rem`. DM Sans 600 0.875rem. On hover: background lifts to Kiln Light, `translateY(-1px)`.
- **Secondary / Outlined:** Transparent background, 1.5px Border Strong outline, Ink text. Hover: Sand background. No lift.
- **Ghost / Text:** No background, no border. Muted text at rest, Ink on hover. Reserved for non-primary in-context actions (print, dismiss, secondary links).
- **Focus:** 2px Kiln outline, offset 3px. No glow.

### Cards and Containers

- **Corner Style:** Rounded-card (1.25rem, 20px) for standard cards. 1.5rem (rounded-3xl) for larger dashboard containers.
- **Background:** Kitchen Linen for primary cards. Sand for surface cards on lighter pages. Oat for inset rows and ingredient items.
- **Shadow Strategy:** Card Ambient at rest. Card Lift on hover only when the card is interactive.
- **Border:** 1px solid Border (`#E8E0D6`) on all cards. Border Strong for emphasized frames.
- **Internal Padding:** 1.5rem standard; 1rem for compact inner components. Never uniform across nesting levels.

### Segmented Control (Pill Toggle)

The grams/cups and batch-size toggles in recipe cards. One of the system's signature interaction patterns.

- **Container:** Oat background, full pill, 2px padding.
- **Inactive segment:** Muted text, transparent background.
- **Active segment:** Kitchen Linen background, `0 1px 3px rgba(28,26,23,0.12)` inset shadow, Ink text.
- **Transition:** 120ms ease-out on background and colour.

### Status Chips

The safety rating, supplement tags, and nutrition coverage badges. Three states, each paired to the tertiary colour it semantically belongs to.

- **Balanced / Complete:** Windowsill Sage background, white text. "✓ Mineral-balanced".
- **Caution / Partial:** Set Honey background, Ink Dark text. "Good coverage".
- **Alert / Review:** Kiln background, Kitchen Linen text. Used for vet flags and allergen notices.
- **Shape:** Full pill. Padding `0.375rem 0.75rem`. DM Sans 500, 0.75rem.

### Inputs and Fields

- **Style:** Oat or Sand background, 1px Border border, inner radius (0.75rem).
- **Focus:** 2px Kiln outline, offset 2px. No blur or glow.
- **Placeholder:** Subtle (`#C4B9AE`).

### Navigation

Sticky top header, warm-white at 95% opacity with backdrop blur.

- **Background:** Kitchen Linen at 0.95 opacity + `backdrop-filter: blur(4px)`.
- **Border:** 1px solid Border at the bottom.
- **Nav links:** DM Sans 500, 0.875rem, Muted at rest, Ink on hover. 120ms transition.
- **CTA in header:** Primary button style, tighter padding (0.5rem 1.25rem).
- **Logo hover:** Opacity 0.8.

### Recipe Card (Signature Component)

The most complex and distinctive component in the system. It carries everything a cook needs: personalised identity, nutrition, ingredients, cost, safety, and actions.

- **Container:** Rounded-card (1.25rem), Border, Kitchen Linen background, Card Ambient shadow, `overflow-hidden`.
- **Header zone:** 1.5rem padding, Border bottom. Recipe name in Title (Playfair 600), tagline in italic Muted body text. Safety badge top-right.
- **"Built For" band:** Windowsill Sage Muted background, Border bottom. Dog profile detail in small DM Sans. Always visible; it is the evidence of personalisation.
- **Expandable sections:** Border-bottom only between sections; no nested card treatment. Section labels as uppercase eyebrow in Muted. Chevron rotates 180° open. Transition via `grid-rows` (not `max-height`).
- **Ingredient rows:** Oat background, inner radius (0.75rem), Kiln bullet dot.
- **Recipe step numbers:** Playfair 600 large text, Kiln at 40% opacity. The only instance of serif numbers in the system.
- **Footer actions:** Primary + secondary buttons + print ghost, 1.5rem padding, Border top.

## 6. Do's and Don'ts

### Do:
- **Do** use Playfair Display for all H1–H3 headings. DM Sans for every other element without exception.
- **Do** use Kitchen Linen (`#FDFAF6`) as the default page and card background. Never true white (#ffffff).
- **Do** use the warm-neutral surface stack (kitchen-linen → oat → sand → sand-deep) to convey surface depth. Tonal layering comes first; shadows are secondary.
- **Do** make every CTA a full pill (`border-radius: 9999px`). Rectangular buttons are not in this system.
- **Do** use Kiln on at most 10% of any screen. One dominant Kiln use per visual group.
- **Do** use Windowsill Sage exclusively for positive states (complete nutrition, successful check-in, savings confirmed). Never for caution or warnings.
- **Do** use Set Honey for caution and partial states. Kiln for alerts and primary actions. Garden Shade for authority surfaces.
- **Do** cap body text at 65–75ch line length.
- **Do** vary padding between nesting levels. Uniform padding at every level is monotony.
- **Do** include the "Built For" band on every recipe card. It is the evidence the product does what it claims.

### Don't:
- **Don't** use cold greys. System greys (#888888, #CCCCCC, #999999) are prohibited. Every neutral must be warm-tinted.
- **Don't** use Playfair Display below heading level. Not in labels, not in data readouts, not in navigation, not in error messages. The Serif Boundary Rule is absolute.
- **Don't** build anything that looks like a sterile health-tech product. White backgrounds, clinical blues, chart-heavy dashboards, hospital portal layout: explicitly prohibited. This is a kitchen tool, not a medical device.
- **Don't** use pet industry kitsch. No decorative paw prints, bubble fonts, or primary-colour palettes.
- **Don't** build generic SaaS interfaces. Purple gradient heroes, identical stat-card grids, and hero-metric templates (big number, small label, gradient accent) are prohibited.
- **Don't** put `border-left` or `border-right` greater than 1px as a coloured stripe accent on cards, alerts, or callouts. Use full borders, background tints, or nothing.
- **Don't** use gradient text (`background-clip: text` with gradient background). Use weight and size for emphasis.
- **Don't** nest cards inside cards. Ever.
- **Don't** use Kiln on both a CTA and an adjacent status badge simultaneously. One dominant Kiln use per visual group.
- **Don't** animate CSS layout properties (height, padding, margin). Use `grid-rows` or `opacity` + `transform` for transitions.
