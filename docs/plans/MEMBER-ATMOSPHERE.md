# Member atmosphere and direct Library navigation

## Outcome and direction

The September 5, 2026 request extends the public homepage's bright illustrated gym across the application. Every member page needs depth and integrated company without competing with its task. Library must be a primary destination, including on phones.

The visual system uses daylight cream `#f6f3e9`, forest `#183f35`, teal `#168a89`, warm wood `#e8c578`, paper white `#fffdf7`, and sage `#a8b6a3`. Source Sans 3 remains the reading and control face; the incumbent serif carries welcoming headings. Left-aligned content sits on readable surfaces against an illustrated environment. Characters belong to the scene rather than separate rectangular portraits.

Anthropic's official [frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) informs subject-specific composition and restrained decoration. Impeccable supplies responsive and accessibility craft. The user's pinned public-gym reference determines the direction; no unrelated identity replacement is needed.

## Navigation and surfaces

- Today, Routine, Library, and Progress remain visible in desktop navigation and the phone bottom bar. Library selects its own nested routes; Routine never selects Library.
- Today combines a prominent gym scene with the real greeting, next workout or resume action, and visible browser-local companion choice.
- Library, routine editing, Progress, History, records, Settings, onboarding, and movement forms inherit the atmosphere. Their heading scenes stay separate from controls and reading content.
- The active workout keeps entry controls first, with restrained environment at the margins and a compact companion treatment outside the logger. Its route bar includes Library.
- Public browsing surfaces inherit scene-based companions where they already support companions. The approved public welcome remains the visual anchor.

## State, types, and persistence

No schema or training-domain change is required. Server-derived Firebase ownership, immutable snapshots, metric storage, verified mutation eligibility, loading/error feedback, and offline recovery remain authoritative. Companion choice stays `pip | mica | off` in browser-local storage and remains available in Settings. Off removes characters. Asset failure hides decorative media without hiding semantic content.

## Responsive behavior, accessibility, and privacy

Reserve artwork dimensions; use optimized local WebP files and responsive crops. On phones, reduce the scene's size rather than hiding all personality. Prevent art from covering headings, navigation, form fields, or Start/Resume. Keep four labeled navigation targets at least 48 px high. Test desktop, phone, dark mode, reduced motion, keyboard focus, forced colors, and horizontal overflow. Decorative media has empty alt text, hidden semantics, and no pointer or focus target. No private media, identity, or fitness data enters public artwork or evidence.

## Acceptance and release verification

First demonstrate failing navigation tests for direct Library access and route selection. Verify their passing result after the fix. Run typecheck, lint, unit/integration tests, documentation parity, service-worker generation checks, and production build/boundary checks. Browser evidence must cover Today, Routine, Library/search, Progress, Settings/companion choice, and the workout on phone and desktop, plus representative public surfaces. Use synthetic local fixtures and scoped disposable hosted QA accounts with exact cleanup; never modify the owner's routine for verification.

Push and merge the feature branch after QA, verify the Git-connected production deployment and stable URL, update canonical documentation and HTML twins, then synchronize local main and remove completed branches/worktrees. Keep only the newest completed QA evidence; historical release records remain in Git.

## Asset provenance

Seven integrated scenes with six characters use the project's original dawn studio and ready character illustrations as image-generation references. They are opaque scene illustrations, not transparent exports. Initial transparency attempts lacked alpha and are excluded from the application. Public derivatives retain optimized WebP output. No private reference recording was used.

## Illustration system and verification corrections

The cast uses one line-weight, cel-animation, daylight, cream-wall, wood-floor, and teal-equipment family. Today uses Pip or Mica welcoming; Library uses an otter studying; Routine uses a beaver planning; Progress and History use a tortoise reviewing; Settings uses a hare packing; workout/day surfaces use Pip recovering. These poses provide contextual company without claiming saved state or achievements. [Atlassian illustration guidance](https://atlassian.design/guidelines/brand/illustrations/) and [GitLab illustration principles](https://design.gitlab.com/brand-design/visual-design-brand-illustrations) informed context, scale, and restraint.

Library remains searchable before routine setup, with an explicit dumbbell/bodyweight/bench scope and a setup action instead of private-exercise creation. Navigation tests failed twice before the link and selection correction, then passed. The pre-setup route test failed on the old redirect, then passed. Browser inspection corrected a Today artwork stacking conflict and dark-mode Settings contrast. The new WebP exports use 1200- and 600-pixel widths; prompt and reference provenance is stored beside each file.
