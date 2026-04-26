## Context

The current integration workflow runs the local action against `test/fixtures/policy.hujson` using OIDC and OAuth credentials. The pull request workflow only runs unit tests and build checks, so the repository does not currently exercise the local action in a PR workflow with report-comment permissions. The integration workflow also does not create a controlled remote ACL drift condition before running the action, which leaves the modified-externally warning path covered mostly by unit tests.

The change is internal to this repository. It must preserve compatibility with `tailscale/gitops-acl-action` and must not alter user-facing inputs, action modes, cache files, ETag calculation, validation behavior, apply behavior, or supported auth modes.

## Goals / Non-Goals

**Goals:**

- Add multiple policy fixtures with clear scenario names so workflows can test no-op, changed-policy, and manual-drift paths.
- Run the local action in pull request workflows with permissions sufficient to publish or update the action-owned PR report comment.
- Add a workflow scenario that manually changes the test tailnet ACL with OAuth client credentials before running the action, making the modified-externally behavior visible in CI logs.
- Keep live workflow behavior deterministic enough to debug by restoring or applying known fixture state where needed.

**Non-Goals:**

- Do not change runtime action behavior or public inputs.
- Do not require API-key authentication for users; the internal drift setup uses the same OAuth client credentials already required for integration coverage.
- Do not replace Vitest coverage or remove existing OIDC/OAuth workflow coverage.
- Do not introduce new runtime dependencies.

## Decisions

1. Use named fixture files under `test/fixtures/`.

   Rationale: named fixtures make workflow matrix entries and logs self-explanatory, and they keep each scenario's policy content reviewable. Alternative considered: mutate one fixture during workflows. That would reduce file count but make runs harder to reproduce locally and review.

2. Add PR action execution to the repository's internal workflows rather than relying only on unit tests.

   Rationale: PR reporting depends on GitHub event payloads, token permissions, and live workflow environment variables. Unit tests cover logic, but a workflow run catches permission and event-shape regressions. Alternative considered: keep PR behavior as unit-test-only coverage. That misses the exact environment where reporting is intended to run.

3. Implement manual drift by calling the Tailscale ACL API from workflow steps before invoking the local action.

   Rationale: the action detects drift by comparing the cached ETag to the current control ETag, so the most faithful test is to modify the control policy outside the action. Alternative considered: writing a fake `version-cache.json` only. That can force the warning path but does not demonstrate what happens after a real out-of-band API change.

4. Keep the drift scenario isolated from normal apply coverage.

   Rationale: live tailnet ACL state is shared and sensitive. A dedicated scenario can apply a known baseline, make one manual change, run the action, and then restore expected state without making every integration job depend on drift sequencing. Alternative considered: folding drift into every integration run. That would make concurrency and cleanup harder to reason about.

## Risks / Trade-offs

- [Risk] Live ACL workflow steps can leave the test tailnet in an unexpected state if a run is cancelled. -> Mitigation: use a dedicated internal fixture and include cleanup or restore steps guarded with `always()` where practical.
- [Risk] PR comments from internal workflow tests can be noisy. -> Mitigation: rely on the action-owned marker so repeated runs update one comment instead of creating duplicates.
- [Risk] OAuth access tokens exchanged during workflow steps increase log sensitivity. -> Mitigation: mask exchanged tokens immediately, continue to exercise OIDC/OAuth auth modes for the action itself, and avoid printing secret values.
- [Risk] Multiple live scenarios can contend for one tailnet. -> Mitigation: keep concurrency serialization for integration runs and use fixture names that make state transitions explicit.
