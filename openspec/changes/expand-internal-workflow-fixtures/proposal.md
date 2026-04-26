## Why

The repository's internal GitHub Actions coverage currently exercises the action with one shared policy fixture, which leaves pull request reporting and externally modified ACL behavior under-tested in real workflows. Adding PR-focused internal runs, multiple policy fixtures, and an explicit manual-drift scenario will make regressions in reporting, validation, apply, cache, and ETag handling easier to catch.

## What Changes

- Add internal workflow coverage that runs the local action in pull request contexts and verifies PR reporting behavior with GitHub token permissions.
- Expand policy fixtures from a single `test/fixtures/policy.hujson` file to multiple named fixtures that exercise no-op, changed-policy, and externally modified ACL scenarios.
- Add an internal workflow path that manually modifies the test tailnet ACL through the Tailscale API using workflow API-key credentials, then runs the action to demonstrate and verify the modified-externally warning path.
- Preserve backwards compatibility with `tailscale/gitops-acl-action`; this change only affects repository-owned workflows, fixtures, and test coverage.
- Do not change action inputs, auth modes, policy validation behavior, apply behavior, cache file format, local ETag calculation, or Tailscale API semantics.
- Non-goals: replacing unit tests with live workflows, changing release workflows, changing production user workflow recommendations, or requiring API-key auth for users who use OAuth or OIDC.

## Capabilities

### New Capabilities
- `internal-workflow-coverage`: Internal CI workflows and fixtures used to validate PR reporting, multiple ACL fixtures, and manually modified remote ACL behavior.

### Modified Capabilities
- `run-reporting`: Pull request report behavior will be covered by internal PR workflows using multiple fixtures.

## Impact

- Affected files include `.github/workflows/*`, `test/fixtures/**`, and OpenSpec artifacts.
- Internal GitHub Actions will require the existing Tailscale secrets plus API-key credentials for the manual-drift scenario.
- No runtime dependency changes are expected.
- The change should not affect external users unless they opt into copying these internal workflow patterns.
