## Why

External ACL drift is currently easy to miss in workflow output: it appears as a log warning, but the run summary and pull request report do not clearly surface it. Internal workflows also need to pass the GitHub token when invoking the local action so pull request reporting can actually publish comments.

## What Changes

- Ensure repository-owned pull request and integration workflows pass `GITHUB_TOKEN` to the local action when PR reporting is expected.
- Promote the "policy file was modified externally" condition into the action run summary.
- Include the same external modification warning in the action-owned pull request report when the run is for a pull request.
- Preserve backwards compatibility with `tailscale/gitops-acl-action`; no inputs, auth modes, validation behavior, apply behavior, cache file format, local ETag calculation, or Tailscale API semantics change.
- Keep reporting best-effort: failure to write a summary or pull request comment must not alter validation/apply/cache/ETag outcomes.
- Non-goals: changing drift detection semantics, changing cache update behavior, failing the action solely because drift is detected, or requiring users to configure a new token input.

## Capabilities

### New Capabilities

### Modified Capabilities
- `run-reporting`: Report externally modified ACL warnings in summaries and pull request comments.
- `internal-workflow-coverage`: Ensure internal workflows pass GitHub token context to local action invocations that are expected to publish pull request reports.

## Impact

- Affected code includes `src/index.ts`, `src/reporting.ts`, associated tests, and the checked-in `dist/` bundle.
- Affected workflows include `.github/workflows/pull-request.yml` and `.github/workflows/integration.yml`.
- No runtime dependency changes are expected.
