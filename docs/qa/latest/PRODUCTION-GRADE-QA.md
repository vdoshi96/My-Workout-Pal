# Production-grade implementation: time-zone correction

## September 22 time-zone contract correction

The owner requested Chicago after seeing the Node 24.19.0 alias report. Local Node resolves `Intl.DateTimeFormat().resolvedOptions().timeZone` to `America/Chicago`, with UTC-6 in January and UTC-5 in July. The macOS zone is also `America/Chicago`. No system setting or account preference needs to be inferred from the global supported-zone list.

The contract correction retains `America/Chicago`, requires UTC and every runtime-supported zone, and preserves a supplied saved value, including `Asia/Kolkata`. It removes the requirement that an unsaved alias appear in a runtime that omits it. The implementation plan records this bounded correction to acceptance-test rule 2. No other acceptance block or application source changes.

The original alias assertion fails against the section 3.3 algorithm on Node 24.19.0 / ICU 78.3. The existing corrected time-zone acceptance block passes when evaluated against the section 3.3 algorithm, both with the installed runtime list and a synthetic list using the alternate Kolkata name. This is algorithm-contract verification; the application helper does not exist yet. This contract correction does not implement the missing helpers or establish a passing full acceptance suite. The audit branch remains active and cannot merge to main until the broader implementation and its required checks are complete.

### Correction verification

| Check | Result |
| --- | --- |
| Original unsaved-Kolkata assertion against section 3.3 algorithm | Failed as reproduced before the edit |
| Existing corrected acceptance block against section 3.3 algorithm | Passed for installed Node list and synthetic alternate-name list |
| Local default time zone | `America/Chicago` |
| `pnpm exec eslint tests/unit/production-audit-contracts.test.ts` | Passed |
| `git diff --check` | Passed |
| `pnpm exec vitest run tests/unit/production-audit-contracts.test.ts` | Still fails collection: missing `@/domain/navigation/member-return`; one failed file, no tests executed |
| `pnpm docs:build` and `pnpm docs:check` | Rendered and verified 72 documentation files |

The wiki's stale reference to removed Quiet Set QA is corrected to the existing member-atmosphere release report. The last completed application evidence remains intact because this correction does not replace that release QA. No new test file, test block, application helper, browser screenshot, or production verification was added.

### Correction closeout

The correction is committed locally on `vishal/production-grade-audit`. GitHub confirmed that the signed-in account owns the origin repository and has push permission. Automatic approval review still rejected publication because the public branch contents require explicit user approval. Nothing was pushed, merged, or deployed. The canonical checkout remains the sole active worktree for the unfinished audit.

## Historical blocked attempt at 81715d7

The remainder records the earlier attempt before the correction. Its unchanged-source and required-stop statements describe that attempt, not the corrected acceptance contract.


September 22, 2026. Source commit: `81715d70c7a2cf85832093681ea5e6bd3756c9b5`. Branch: `vishal/production-grade-audit`. This is the section 10 report for a blocked attempt, not completed release QA. Application source, dependencies, and every test remain unchanged. Only this report, the project status, and their generated HTML counterparts change locally.

## Win conditions W1–W7

| Condition | Result | Command and exact output |
| --- | --- | --- |
| W1 | Fail: baseline only | `npx vitest run tests/unit/production-audit-copy.test.ts tests/unit/production-audit-contracts.test.ts`: `Test Files  2 failed (2)` and `Tests  25 failed \| 1 passed (26)` |
| W2 | Not run: required stop | `pnpm test:e2e:authenticated -- production-audit` |
| W3 | Not run: required stop | `pnpm exec playwright test production-audit-public --project chromium-phone --project chromium-desktop` |
| W4 | Not run: required stop | `pnpm verify` |
| W5 | Not run: required stop | `pnpm test:e2e:authenticated` and `pnpm test:e2e:release` |
| W6 | Incomplete | This blocked report exists. No replacement screenshots or completed implementation evidence exist. Documentation parity is checked separately below. |
| W7 | Delivered as a blocked report | This report follows section 10's order and records the required stop. |

The contracts file fails during collection because the planned `src/domain/navigation/member-return.ts` module does not exist. Its time-zone assertion has not executed in Vitest. The time-zone conflict below is independently reproduced with the exact section 3.3 algorithm. The copy test's baseline failures are expected before implementation. There is no final passing implementation run or implementation commit.

Documentation parity passes: `pnpm docs:build` reports `Rendered 72 documentation files.` and `pnpm docs:check` reports `Verified 72 documentation files.` Both exit 0.

## Items from sections 3–7 not implemented

Every implementation item remains unimplemented because acceptance-test rule 2 requires a stop when an acceptance assertion conflicts with the contract. The instruction is: "Do not edit the four acceptance files. If you believe one is wrong, stop and say which assertion and why in the report; do not work around it."

| Section | Outstanding scope | Reason |
| --- | --- | --- |
| 3.1 | Runner rest preservation, prefill, failed-change discard, leaving rules, resume requeue check, and finishing messages | Required stop before application edits |
| 3.2 | Set-entry error presenter | Required stop before application edits |
| 3.3 | Clock entry, time-zone options, member return path, and readable routine validation helpers | Time-zone contract conflict; required stop before application edits |
| 3.4 | Manifest | Required stop before application edits |
| 4 | All runner UI, recovery, route, and practice changes and fixture mirrors | Required stop before application edits |
| 5 | All routine, equipment, chooser, custom movement, onboarding, title, label, and dead-code changes and fixture mirrors | Required stop before application edits |
| 6 | All member shell, account, settings, navigation, motion, sign-in return, sign-out, library, insight, and companion changes and fixture mirrors | Required stop before application edits |
| 7 | All public pages, shared guide, navigation, authentication, recovery, and PWA copy changes and fixture mirrors | Required stop before application edits |

### Blocking assertion and reproduction

`tests/unit/production-audit-contracts.test.ts:303` asserts:

```ts
expect(options).toContain("Asia/Kolkata");
```

Its input is `timeZoneOptions("Mars/Olympus_Mons")`. Section 3.3 specifies the runtime's supported time zones, with only UTC and the supplied saved value added. On the installed Node 24.19.0 / ICU 78.3 runtime, that list contains `Asia/Calcutta` but omits `Asia/Kolkata`.

This read-only reproduction applies the specified algorithm without adding or changing any source or test file:

```sh
node --input-type=module -e '
import assert from "node:assert/strict";
const saved = "Mars/Olympus_Mons";
const options = [...new Set([
  ...Intl.supportedValuesOf("timeZone"), "UTC", saved,
])].sort((a, b) => a.localeCompare(b, "en-US"));
console.log({
  node: process.version,
  icu: process.versions.icu,
  count: options.length,
  kolkata: options.includes("Asia/Kolkata"),
  calcutta: options.includes("Asia/Calcutta"),
});
assert.ok(options.includes("Asia/Kolkata"));
'
```

Observed values: `node: v24.19.0`, `icu: 78.3`, `count: 420`, `kolkata: false`, `calcutta: true`. The assertion exits 1. UTC, America/Chicago, and the supplied saved value are present.

Proposed correction: change the acceptance assertion to require every entry from `Intl.supportedValuesOf("timeZone")`, rather than requiring a particular alias absent from that runtime's list. Alternatively, revise section 3.3 to require `Asia/Kolkata` as an additional alias. Neither correction has been applied because the plan prohibits editing acceptance tests and requires literal implementation. The blocker is an unresolved choice between these two contracts.

## Edits to pre-existing tests

None. The four acceptance files and all pre-audit tests are unchanged. No test blocks, skips, retries, timeouts, or snapshots were added.

## Noticed, not changed

No additional out-of-scope product findings were investigated. The prior member-atmosphere QA report and screenshots remain because this attempt produced no verified replacement evidence. No browser screenshots, production verification, or deployment are claimed.

## PR URL

None. Implementation stopped before a commit, push, or PR. The existing branch and canonical checkout remain available for resumption after the contract is corrected. No merge, deployment, branch deletion, or production-data action occurred.
