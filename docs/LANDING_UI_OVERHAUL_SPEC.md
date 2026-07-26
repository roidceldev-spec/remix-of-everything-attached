# No More Copium — Landing UI Overhaul Specification

Status: implemented in development; requires deployment and browser verification.

Last updated: 2026-07-26

## Scope

Landing-only changes apply only to the four-section public landing experience. The readable text-size floor is universal and applies throughout the web app.

## Universal readable text floor

The text size used by `JFL, look at this.` establishes the minimum readable size:

- Minimum font size: `1rem` / 16px.
- Existing larger headings and display text remain larger.
- Tailwind `text-xs`, `text-sm`, responsive small-text variants, and known arbitrary values below 1rem are raised to the minimum.

## Section 1 — rotating headline

Phrase order remains:

1. Heightmax
2. Dream physique
3. Bigger hands and wrist
4. Fix asymmetries
5. Prevent injuries
6. Fix posture

Timing:

- Each phrase is completely stationary for exactly 1,000ms.
- Replacement animation lasts exactly 500ms.
- Old phrase moves downward.
- New phrase enters from directly above and moves downward into place.
- Both move simultaneously with the same easing.
- No opacity crossfade during normal motion.
- No overlap between old and new phrase positions.
- Infinite loop.
- Reduced-motion users receive a short fade instead.

## Sections 1 and 2 — image-to-black gradient

The white hero placeholder/image and Section 2 transformation image must blend gradually into the black text region.

The gradient uses a long multi-stop fade:

- Transparent at the image side.
- Very light darkening first.
- Gradual middle blend.
- Near-black before reaching the text region.
- Solid black at the end.

Section 3 keeps its existing gradient because it was already visually acceptable.

## Section 4 — price and value cards

Title remains at the top:

> All this for just $29/month

`$29/month` remains red.

Replace bullet points with six compact long cards. Every card contains:

- A one-color minimal icon on the left.
- Red highlighted lead text beside the icon.
- Unhighlighted body text on its own line directly below the lead.
- Subtle border, rounded corners, and restrained dark background.

### Icons

1. **No AIslop**
   - `AI` inside a circle with a diagonal prohibition slash.

2. **1-1 Access to Dethnic**
   - Minimal chat bubble with message lines.

3. **Beginner? Struggling to stay consistent?**
   - Minimal dumbbell.

4. **Growth Plates Closed?**
   - Two long bones arranged closely in parallel with a small gap.

5. **Best Progress Tracking**
   - Minimal upward-trending line with one downturn/zigzag.

6. **Guided Workouts**
   - Mostly complete circular progress/guidance arc with an intentional gap and a minimal play/guide marker.

All icons:

- Single red color.
- Thin consistent stroke.
- No generated illustration style.
- No gradients, shadows, or decorative complexity inside the icon.

## Verification checklist

- [ ] Phrase remains still for 1,000ms.
- [ ] Both phrases move simultaneously for 500ms.
- [ ] No headline overlap.
- [ ] Section 1 gradient blends smoothly.
- [ ] Section 2 gradient blends smoothly.
- [ ] Section 3 remains unchanged.
- [ ] No web-app text renders below 1rem.
- [ ] Price title remains at the top.
- [ ] Six value cards render in exact order.
- [ ] Each body starts on a separate line.
- [ ] Icon mapping matches the approved specification.
- [ ] Final Continue button remains usable.
- [ ] Section 4 fits common Android viewport heights without clipping.
