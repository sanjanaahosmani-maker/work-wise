---
name: IntervYou
description: Technical monograph workspace for end-to-end interview preparation.
colors:
  midnight-teal-rail: "#0b192c"
  midnight-teal-deep: "#081322"
  midnight-teal-border: "#172b47"
  midnight-teal-hover: "#132642"
  precision-teal: "#0d9488"
  precision-teal-deep: "#0f766e"
  precision-teal-bright: "#2dd4bf"
  precision-teal-mist: "#5eead4"
  precision-teal-tint: "#f0fdfa"
  warm-amber-signal: "#d97706"
  warm-amber-bright: "#fbbf24"
  alabaster-ground: "#f5f7f8"
  porcelain-surface: "#ffffff"
  slate-surface-subtle: "#f8fafc"
  slate-surface-muted: "#f1f5f9"
  obsidian-ground: "#09111b"
  obsidian-surface: "#101b29"
  obsidian-input: "#0b1420"
  obsidian-hover: "#18273a"
  obsidian-elevated: "#162335"
  hairline-border: "#e2e8f0"
  input-border: "#cbd5e1"
  obsidian-border: "#1e2d40"
  obsidian-border-strong: "#2b3f57"
  ink-primary: "#0b192c"
  ink-muted: "#64748b"
  ink-subtle: "#94a3b8"
  ink-dark-primary: "#f1f5f9"
  ink-dark-secondary: "#dbe4ef"
  emerald-success: "#059669"
  emerald-bright: "#6ee7b7"
  emerald-dark-tint: "rgba(16, 185, 129, 0.14)"
  emerald-dark-border: "rgba(52, 211, 153, 0.3)"
  rose-critical: "#e11d48"
  rose-bright: "#fda4af"
  rose-dark-border: "rgba(244, 63, 94, 0.35)"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    fontFeature: "\"tnum\" 1"
rounded:
  xs: "0.375rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.precision-teal}"
    textColor: "{colors.porcelain-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.precision-teal-deep}"
  button-secondary:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-hero:
    backgroundColor: "{colors.precision-teal}"
    textColor: "{colors.porcelain-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  card-surface:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
---

# Design System: IntervYou

## Overview

**Creative North Star: "The Technical Monograph Desk"**

IntervYou organizes end-to-end interview preparation as a calm, authoritative studio desk. A persistent deep midnight-teal navigation rail anchors crisp alabaster and porcelain working surfaces, keeping dense workflows—resume building and AI correction, ATS auditing, exam-mode Q&A, study guides, mock interviews, and job-listing verification—legible without visual noise.

Interactions feel tactile and responsive rather than theatrical: segmented tab pills and navigation active states glide with spring damping, interactive module and metric cards lift slightly on hover, and exam transitions slide cleanly between questions. Both Light and Dark themes preserve strict contrast and clear state semantics (note that built Dark mode lands slightly deeper at `#09111b` / `#101b29` than the initial `#0A111A` / `#111C2B` direction-brief draft).

**Key Characteristics:**
- Committed midnight-teal command rail paired with high-contrast alabaster or obsidian-teal work canvases.
- Editorial display voice (`Bricolage Grotesque`) matched with crisp `Manrope` UI text and `JetBrains Mono` tabular figures.
- Spring-damped active indicators (`layoutId`) and subtle hover-lift elevation on interactive cards.
- Zero purple/indigo AI clichés, zero decorative kickers above page headings, and restrained amber/emerald/rose state accents.

## Colors

A focused high-contrast palette anchored by a deep midnight-teal shell, warm alabaster or obsidian grounds, and precision teal actions.

### Primary
- **Precision Teal** (`{colors.precision-teal}`): Primary call-to-action buttons, active tabs, progress bars, text carets, and focus-visible outlines.
- **Deep Teal Hover** (`{colors.precision-teal-deep}`): Hover and press state for primary controls and inline text actions in Light mode (`{colors.precision-teal-bright}` in Dark mode).

### Secondary
- **Warm Amber Signal** (`{colors.warm-amber-signal}`): Improvement areas, mock session chart bars, latest mock score accent, and review cautions (`{colors.warm-amber-bright}` in Dark mode).

### Neutral
- **Midnight Teal Rail** (`{colors.midnight-teal-rail}`): Persistent left sidebar, split-screen login showcase, Overview readiness hero, and Recharts tooltip surface in both themes (`{colors.midnight-teal-deep}` and `{colors.midnight-teal-hover}` for nested showcase containers).
- **Alabaster Ground** (`{colors.alabaster-ground}`) & **Porcelain Surface** (`{colors.porcelain-surface}`): Light-mode canvas, elevated workspace cards, and subtle nested panels (`{colors.slate-surface-subtle}` / `{colors.slate-surface-muted}`).
- **Obsidian Ground** (`{colors.obsidian-ground}`) & **Obsidian Surface** (`{colors.obsidian-surface}`): Dark-mode canvas and workspace cards, paired with `#0b1420` (`{colors.obsidian-input}`) form inputs and `#162335` (`{colors.obsidian-elevated}`) muted wells.
- **Hairline Borders** (`{colors.hairline-border}` / `{colors.input-border}` in Light mode; `{colors.obsidian-border}` / `{colors.obsidian-border-strong}` in Dark mode): 1px structural dividers separating cards, headers, and form controls.
- **Semantic Status** (`{colors.emerald-success}` / `{colors.emerald-bright}` and `{colors.rose-critical}` / `{colors.rose-bright}`): Mastery checkmarks, ATS matched keywords, and inline validation alerts.

### Named Rules
**The Committed Rail Rule.** The left navigation rail stays deep midnight-teal (`#0b192c`) across both Light and Dark themes so spatial orientation never flickers when toggling themes.
**The Restrained Signal Rule.** Precision teal owns primary actions; amber, emerald, and rose appear strictly for semantic metrics, mastery states, cautions, and validation errors.

## Typography

**Display Font:** Bricolage Grotesque (with ui-sans-serif, system-ui, sans-serif fallback)
**Body Font:** Manrope (with ui-sans-serif, system-ui, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, monospace fallback)

**Character:** Expressive geometric display headers give page and card titles crisp editorial authority (`-0.02em` heading tracking), while `Manrope` keeps dense study notes and form controls effortless to scan and `JetBrains Mono` aligns numerical scores with `tabular-nums`.

### Hierarchy
- **Display** (700, 2.25rem at `sm+`/`xl+` and 1.875rem mobile, 1.15 line-height, -0.02em tracking): Hero headlines, split-screen showcase thesis, and prominent ATS score readouts.
- **Headline** (700, 1.5rem, 1.33 line-height, -0.02em tracking): Workspace module `<h1>` page titles and authentication form headers.
- **Title** (600, 1rem–1.125rem, 1.5 line-height, -0.02em tracking): Card headers, modal headers, track dividers, and active exam question prompts.
- **Body** (400–500, 0.875rem, 1.6 line-height; 1rem on hero lead paragraphs): Form inputs, study explanations, and Q&A feedback.
- **Label** (500–600, 0.75rem with 0.6875rem helper captions, 1.33 line-height): Form labels, segmented controls, secondary buttons, and `JetBrains Mono` `tabular-nums` counters and scores.

### Named Rules
**The Tabular Metric Rule.** Every numerical score, question counter, timer, and summary metric pairs `JetBrains Mono` with `tabular-nums` so numbers align cleanly without horizontal jitter.

## Layout

Desktop views pair a persistent 256px sticky left navigation rail with a sticky 64px top bar (breadcrumb + Light/Dark toggle + Interview Q&A action) and a centered `max-w-6xl` (`1152px`) workspace canvas padded `24px–32px`. Multi-pane workflows (Resume Builder `5/7`, ATS Checker `7/5`, Interview Q&A `4/8`, Profile `4/8`, Fake Job Detection `7/5`, Voice Assistant setup `7/5`) use `12-column` responsive grids with `24px` (`1.5rem`) gaps, while Overview uses a `32px` vertical rhythm (`2-col` to `4-col` metrics and `1/2/3-col` module grid). Below `1024px`, the navigation rail collapses into a slide-over drawer triggered from the top bar, and the Login split screen collapses to a compact midnight-teal top banner above the centered auth form.

## Elevation & Depth

Surfaces rely primarily on tonal separation and crisp 1px borders (`{colors.hairline-border}` / `{colors.obsidian-border}`), with soft directional shadows reserved for resting workspace panels and hover-elevated interactive cards.

### Shadow Vocabulary
- **Card Resting** (`box-shadow: 0 1px 2px rgba(11, 25, 44, 0.04), 0 4px 12px -4px rgba(11, 25, 44, 0.04)`): Subtle lift applied via `.card-elevated` across standard workspace panels.
- **Card Hover** (`box-shadow: 0 4px 10px -2px rgba(11, 25, 44, 0.06), 0 14px 28px -8px rgba(13, 148, 136, 0.12)`): Applied alongside `-2px` vertical lift (`200ms cubic-bezier(0.16, 1, 0.3, 1)`) and teal border highlight on `.card-interactive` elements during hover.

### Named Rules
**The Hover-Earned Lift Rule.** Cards rest gently on hairline borders with low-opacity ambient depth; directional `-2px` lift and teal-tinted shadow appear only on interactive cards during hover.

## Shapes

Consistent modern corners—`6px` (`0.375rem`) for compact icon triggers and exam jump pills, `8px` (`0.5rem`) for buttons, inputs, and nested summary panels, `12px` (`0.75rem`) for workspace cards, navigation pills, segmented tablists, and modals, `16px` (`1rem`) for the Overview readiness hero, and `9999px` for avatars, progress tracks, and scrollbars—framed by 1px borders. Dark showcase containers (`LoginPage`, `OverviewPage`) layer a subtle `40px`/`48px` `#5eead4` coordinate grid at `6%–7%` opacity behind text.

## Components

### Buttons
- **Shape:** Gently rounded (`8px` standard, `12px` for Overview hero CTAs) with `scale(0.985)` active press feedback (`140ms cubic-bezier(0.16, 1, 0.3, 1)`).
- **Primary:** Precision Teal fill (`{colors.precision-teal}`), white label, `10px 16px` padding (`10px 20px` on hero CTAs).
- **Hover / Focus:** Shifts to Deep Teal (`{colors.precision-teal-deep}`) with `2px` teal `:focus-visible` outline (`2px` offset).
- **Secondary:** Porcelain surface (`{colors.porcelain-surface}`) with 1px input border (`{colors.input-border}`), `8px 14px` padding (`12px` medium/semibold label), shifting to subtle slate or `#18273a` hover in Dark mode.

### Cards / Containers
- **Corner Style:** Rounded (`12px`; `16px` for Overview hero).
- **Background:** Porcelain in Light mode (`{colors.porcelain-surface}`), Obsidian Surface in Dark mode (`{colors.obsidian-surface}`).
- **Shadow Strategy:** Resting `.card-elevated` directional shadow; interactive cards add `.card-interactive` (`-2px` hover lift + `{colors.precision-teal-mist}` border highlight).
- **Border:** 1px solid hairline (`{colors.hairline-border}` / `{colors.obsidian-border}`).
- **Internal Padding:** `20px` to `24px` (`32px–40px` on Overview hero).

### Inputs / Fields
- **Style:** 1px stroke (`{colors.input-border}` light / `{colors.obsidian-border-strong}` dark), `#ffffff` or `#0b1420` surface, `8px` radius, `8px 12px` to `10px 14px` padding (`6px 12px` in dense Resume Builder fields).
- **Focus:** `2px` ring in Precision Teal (`{colors.precision-teal}`).

### Navigation
- **Style:** Persistent `256px` midnight-teal left rail (`{colors.midnight-teal-rail}`) with spring-animated active pill (`layoutId="sidebarActiveNav"`, `stiffness: 420, damping: 32`), icon hover scale (`1.1`), and a circular-avatar Profile footer card.

### Segmented Tab Switcher
- **Style:** Reused across Authentication, Profile, Resume Import, and Study Tiers (`{colors.slate-surface-muted}` well, `1px` `{colors.hairline-border}`, `12px` radius, `4px` padding) with a spring-animated porcelain active pill (`8px` radius).

## Do's and Don'ts

### Do:
- **Do** use `tabular-nums` with `JetBrains Mono` for all ATS scores, question counts, timers, and session progress metrics.
- **Do** pair interactive hover states with clear border/shadow transitions and accessible `:focus-visible` outlines.
- **Do** support both Light and Dark theme tokens consistently across every form, modal, and chart.

### Don't:
- **Don't** introduce purple/indigo gradient accents or eyebrow kickers above page `<h1>` headings.
- **Don't** place one-sided vertical accent bars on rounded containers.
- **Don't** hide core exam, resume, or ATS workflow steps behind modals when inline progression fits.
