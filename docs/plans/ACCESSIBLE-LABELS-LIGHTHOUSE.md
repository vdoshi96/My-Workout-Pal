# Accessible labels and production Lighthouse plan

## User outcome

Guests and members can activate the brand-home links and five starter-day waypoint controls with speech input, a screen reader, a keyboard, touch, or a pointer using names that include the controls' visible text. The public production surfaces retain their visual identity and navigation behavior while clearing the WCAG 2.5.3 label-in-name finding surfaced by Lighthouse 13.4.1.

## Navigation and UI states

- The landing brand continues to navigate to `/`; public interior-page brands continue to navigate to `/`; the authenticated brand continues to navigate to `/app`.
- The five landing waypoints continue to select Push, Pull, Legs, Upper, or Lower in place. `aria-current="step"` remains the selected-state signal.
- Visible brand copy, taglines, waypoint numbers, and waypoint names do not change. Loading, selected, unselected, keyboard-focus, dark, reduced-motion, forced-colors, narrow-screen, and offline-compatible public states preserve the same content and destinations.
- No new empty, error, interrupted, or retry state is introduced. A missing accessible-name invariant is a release-blocking test failure rather than a user-visible fallback.

## Types, invariants, persistence, and authorization

- This remediation changes semantic markup only; domain types, API envelopes, stored records, canonical measurements, program revisions, workout snapshots, and cache policy remain unchanged.
- A visible text label must be contained in the computed accessible name. Native link and button content is the source of truth; redundant overriding `aria-label` attributes must not shorten or reorder that visible text.
- Route access, Firebase session verification, server-derived UID ownership, CSRF checks, and verified-email mutation gates are unchanged. The authenticated shell receives the same server-verified viewer and discloses no additional identity data.
- The change performs no read or write against local storage, IndexedDB, Neon, Firebase, YouTube, analytics, or external services.

## Responsive behavior and accessibility

- Phone, tablet, and desktop layouts retain existing breakpoints and minimum target sizes. At a 640 CSS-pixel layout viewport representing 200 percent zoom from a 1,280-pixel desktop viewport, primary public routes must have no horizontal document overflow and all actions must remain reachable.
- With `forced-colors: active`, interactive controls retain discernible text, system-color focus outlines or borders, selected-state text, and usable SVG-independent meaning.
- Keyboard order, skip-link behavior, visible focus, heading structure, landmarks, reduced motion, light and dark schemes, and touch targets remain unchanged.
- Brand links derive their accessible names from visible brand copy and taglines. Waypoint buttons derive their accessible names from their visible number and day name; test locators must follow those truthful names rather than the removed override.

## Privacy and security

No private user content or provider credential is needed for this public remediation. Browser and Lighthouse evidence uses the public production alias and writes raw reports only to a temporary local directory. Committed QA notes contain aggregate results and bounded diagnostics, never cookies, tokens, raw provider responses, or user data.

## Acceptance criteria

1. A component-rendering regression test proves the three brand variants and landing waypoints do not use a shorter overriding accessible label and retain their visible text.
2. The existing public Playwright journey selects all five waypoints through their native visible names and remains green in Chromium and WebKit.
3. Lighthouse's `label-content-name-mismatch` audit passes on the landing page and public interior shells.
4. Mobile and desktop Lighthouse audits cover `/`, `/program`, a barbell day detail, the dumbbell library, and the read-only sample runner. Performance, accessibility, and best-practices scores plus variability are recorded without turning a score into a correctness claim.
5. Public Chrome inspection at 640 by 900 CSS pixels finds no horizontal overflow on the landing page, program overview, day detail, library, and sample workout; every primary control remains reachable by keyboard.
6. The same routes under active forced colors retain visible content, focus, selected state, and system-color boundaries without relying on route artwork alone.
7. Typecheck, lint, focused unit tests, the public browser matrix, production build, documentation parity, public smoke, runtime-log scan, and local/GitHub/Vercel SHA comparison pass at their stated checkpoints.

## Fail-then-pass and browser evidence

- Retain the pre-implementation Lighthouse 13.4.1 failure showing the landing brand and five waypoint buttons under `label-content-name-mismatch`.
- Add and run the component regression before implementation so it fails on the overriding attributes; rerun it after the semantic fix.
- Rerun the affected Lighthouse route first, then the complete requested mobile/desktop route set.
- Use the Playwright CLI against public production for snapshots and interaction. Use a fresh browser context with `forced-colors: active` for the high-contrast pass and a 640-pixel-wide layout viewport for the 200 percent reflow pass. Record observations and bounded metrics in `docs/qa/latest/` while keeping raw temporary reports untracked.
