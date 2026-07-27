# No More Copium — UI and UX Overhaul Map

Status: Stage 1 and Stage 2 implemented in development; deployment and browser verification required.

Last updated: 2026-07-27

## Product scope

- The overhaul prioritizes the public landing experience and what normal Clients see.
- Coach Mode does not require a dedicated visual overhaul.
- Universal improvements may also affect Coach Mode when sharing them makes the implementation simpler and more consistent.
- Coach Mode appearance is not a priority.
- Conversion and retention should come from clear value, credible proof, trust, personalization, visible progress, and excellent usability rather than deceptive billing or obstructive cancellation.

## Universal attributes

### Visual hierarchy

Every stage must establish a deliberate order of attention, keep primary actions obvious, and avoid competing motion or decoration.

### Color gradients

- Colored gradients are prohibited.
- Black transparent gradients are the only allowed gradients.

### Emojis

- Emojis are prohibited throughout the web app UI.

### Badges

Every Client-facing stage must update the badge-like elements on that surface. Before the loading and error stages, run one final whole-app audit that also covers shared Coach surfaces.

- Reduce overly rounded, blob-like corners.
- Do not change badge copy, color, spacing, behavior, or any other attribute.
- Known examples include the Coach/Client Mode badge and Classic Workout set-information badges.
- The initial source audit found the shared Badge component plus additional badge-like pills across account, workout, program, and navigation surfaces; visual changes remain deferred to their ordered stages rather than being mixed into the landing patch.

## Required development order

Each patch focuses on one stage. A stage may be split into smaller patches when that is necessary for quality.

1. **Landing page overhaul** — implemented in development.
   - No skeleton loading is required before the user leaves the public/access experience for onboarding.
2. **Client Mode dashboard UI and UX** — implemented in development.
3. **Chat system UI and UX** — next.
4. **Onboarding UI and UX**.
5. **Classic workout mode UI and UX**.
6. **Guided workout mode UI and UX**.
7. **Workout History** — list and calendar views.
8. **Loading state**.
   - Skeleton loading must use a slow, steady shimmer wave moving from left to right.
9. **Error state**.

## Stage 1 — landing page

### First page testimonials

Replace the planned hero image placeholder with these three testimonials, preserving order and wording:

> “Dethnic saved my life”
>
> — Tushar

> “Holy shit I haven’t trained in 2 weeks and my wrists are still 18 cm when I measured. It's not just swelling.”
>
> — Garret

> “5' 5 - 5' 10 with No More Copium 1-1 coaching. Every dollar was worth it”
>
> — Dylan

Presentation format:

1. Quote.
2. Em dash and the name of the person who gave the testimonial.

Implementation decisions:

- All three testimonials remain visible at once; there is no carousel or additional competing animation.
- The proof stack uses compact typography and viewport-relative spacing so it fits short Android viewports without reducing text below the universal 1rem floor.
- The approved proportional headline, supporting line, and swipe-cue grid remains intact.
- The dark testimonial background continues into black using only the approved black transparent fade.
- The transformation wipe uses a solid red line rather than a prohibited colored gradient.

## Stage 2 — Client Mode dashboard

Status: implemented in development.

- Top-left greeting using local timezone detection via `Date`. Preserves exact required phrase `Fighting crime? {name}` for 1-5 AM. Other time buckets use friendly human variants that rotate deterministically by day to avoid AI-like repetition.
- Greeting hierarchy: large clamp headline, left-aligned, with supporting line "Here is what is lined up for you today."
- Unread coach messages: prominent min-h-12 link, rounded-xl, primary/10 background, 8px icon container, 1rem text, accessible focus.
- Today's workout: clear hierarchy — weekday label + "Today's workout" heading both 1rem-semibold, card rounded-xl with subtle shadow, workout name line-clamp-2 with title fallback, program name muted, Start workout button min-h-12 rounded-xl full-width on mobile, sm:auto, Play icon.
- TodayState (rest / no program / unavailable): rounded-xl dashed, 1.125rem title, 1rem description, muted background.
- Progress Pictures dashboard: heading 1.125rem-semibold, description 1rem, grid gap 2.5, tiles rounded-lg, habit progress rounded-lg, min-h-12 touch targets, text 1rem throughout, error container rounded-xl, Take pictures button min-h-12 rounded-xl.
- Badge audit for this surface: reduced overly rounded `rounded-full` Client Preview and Coach Mode badges to `rounded-md`. Bottom navigation items increased min-height to 56px and text to 13px-> enforced to 1rem via universal floor, with safe-area padding preserved.
- No colored gradients, no emojis.
- Large touch targets: all primary actions min-h-12, navigation 56px.
- Safe-area, keyboard, screen-reader, reduced-motion preserved.
- Visual hierarchy: greeting → unread → today's workout → progress pictures.

## Form UX principles for applicable later stages

1. Do not enable submission until required fields are valid, and clearly explain what remains incomplete.
2. Validate fields inline when the user leaves a field rather than waiting for a full submission.
3. Show a live remaining-character count wherever a limit exists.
4. Reuse known information and autofill whenever possible.
5. Show password requirements and their live completion state when password authentication returns.
6. Accept reasonable formatting variations and normalize them behind the scenes.

## Error-state principles for the later error stage

Every error message must tell the user:

1. What happened.
2. Why it happened, when that reason is safely known.
3. What the user should do next.

Never expose raw database, backend, stack-trace, or infrastructure errors. Never fail silently.

### Placement rules

- **Inline:** default for field, form, and nearby action failures.
- **Toast:** only when it is genuinely safe for the user to miss the message.
- **Modal:** only when the user cannot continue until the problem is addressed.

Payment errors must make it clear whether payment completed, whether the user was charged, and which recovery action is available. Payment handling remains deferred until a verified merchant provider is selected.

## Quality requirements for every stage

- Preserve all working behavior outside the active stage.
- No unresponsive controls, silent failures, layout clipping, or accidental navigation.
- Maintain safe-area handling and large touch targets.
- Maintain keyboard and screen-reader access.
- Respect reduced-motion preferences.
- Validate short and tall mobile viewports.
- Run formatting, production build, TypeScript, lint, focused executable tests, clean patch validation, and relevant browser automation before delivery.
