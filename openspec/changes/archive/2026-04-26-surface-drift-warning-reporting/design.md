## Context

The action already detects an externally modified ACL when the cached ETag differs from the current control ETag. Today that condition is emitted through the GitHub Actions warning annotation path, but the structured run summary and action-owned pull request report do not carry the warning. In addition, internal workflow invocations that expect PR reporting can miss `GITHUB_TOKEN`, which causes the action to skip PR report publication even when the workflow has the right permissions.

This change crosses action runtime reporting and repository workflow configuration. It must preserve upstream-compatible inputs, auth modes, validation behavior, apply behavior, cache behavior, ETag calculation, and best-effort reporting semantics.

## Goals / Non-Goals

**Goals:**

- Include the external modification warning in the run report model when drift is detected.
- Render that warning in GitHub Actions job summaries.
- Render that warning in action-owned pull request comments when the run has pull request context and a GitHub token.
- Ensure repository-owned workflows pass `GITHUB_TOKEN` to local action invocations that are expected to post PR reports.

**Non-Goals:**

- Do not change how drift is detected.
- Do not make drift detection fail the action by itself.
- Do not change cache updates, local hash calculation, Tailscale API calls, or supported authentication modes.
- Do not add a public action input for GitHub tokens.

## Decisions

1. Add warning state to the existing `RunReport`.

   Rationale: the summary and PR comment are both rendered from `RunReport`, so carrying warnings there keeps output consistent without duplicating drift logic in rendering code. Alternative considered: call `core.warning` and separately append strings in each renderer. That would scatter one condition across multiple places and make future reporting states harder to test.

2. Treat external modification as a report warning, not a run outcome.

   Rationale: the current action behavior warns but continues validation/apply according to the selected mode. Preserving that behavior keeps compatibility with upstream workflows. Alternative considered: introduce a new `outcome` value. That would make reporting less direct because validation can still succeed while drift was detected.

3. Pass `GITHUB_TOKEN` through workflow `env` for local action steps that should post PR reports.

   Rationale: the action already reads `GITHUB_TOKEN`/`GH_TOKEN` from the environment, which matches GitHub Actions conventions and avoids a new input. Alternative considered: adding a new token input. That would create unnecessary public API surface and diverge from the current implementation.

## Risks / Trade-offs

- [Risk] Repeated warning text could make reports noisy. -> Mitigation: include warnings in a dedicated report section instead of duplicating them in every field.
- [Risk] Workflow token permissions may differ between same-repository and forked PRs. -> Mitigation: keep live action steps guarded and preserve best-effort reporting behavior.
- [Risk] Adding report fields could accidentally affect run outcomes. -> Mitigation: keep warnings informational and verify validation/apply/cache tests still pass.
