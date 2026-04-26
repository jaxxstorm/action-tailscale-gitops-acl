## Why

Pull request validation and action run logs currently make it harder than necessary to see the exact policy effect of a run without digging through raw logs or reconstructing the diff manually. Since the action now preserves upstream compatibility, improving review-facing and summary-facing output will make validation results clearer for humans and review agents without changing sync behavior.

## What Changes

- Add pull request output that comments with a clear diff of the tailnet policy changes the action is evaluating.
- Add action run summary output that records the result of the action run, including whether the run validated, changed, skipped, or failed.
- Keep the output focused on proposed policy changes and run outcome, while avoiding any change to authentication, validation, apply semantics, cache file compatibility, or ETag calculation.
- Preserve backwards compatibility with `tailscale/gitops-acl-action`; this change adds reporting behavior only and does not remove or alter existing inputs, modes, API behavior, or cache semantics.
- Non-goals: changing policy normalization, changing upstream-compatible hash behavior, introducing new release tag assumptions, or requiring workflows to use new inputs.

## Capabilities

### New Capabilities

- `run-reporting`: Pull request comments and GitHub Actions job summaries that make policy diffs and run outcomes explicit.

### Modified Capabilities

None.

## Impact

- Affected code: GitHub Action runtime paths that perform validation/apply operations and currently emit logs or summaries.
- Affected systems: GitHub pull request comments and `$GITHUB_STEP_SUMMARY` output for action runs.
- Compatibility: no expected impact on auth modes, Tailscale API validation, policy apply behavior, cache files, ETag handling, or upstream action input compatibility.
