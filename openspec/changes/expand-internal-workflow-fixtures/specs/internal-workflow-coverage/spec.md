## ADDED Requirements

### Requirement: Multiple internal policy fixtures
The repository SHALL provide multiple named policy fixtures for internal workflow scenarios instead of relying on one shared fixture for all live action runs.

#### Scenario: Fixture selection is explicit
- **WHEN** an internal workflow runs the local action
- **THEN** the workflow selects a scenario-specific fixture path rather than assuming `test/fixtures/policy.hujson` is the only available fixture

#### Scenario: Fixtures cover distinct policy states
- **WHEN** maintainers inspect the fixture directory
- **THEN** there are fixtures for no-op, changed-policy, and manually modified control-policy scenarios

### Requirement: Pull request workflows exercise the local action
The repository SHALL run the local action in a pull request workflow using GitHub permissions sufficient for pull request report publication.

#### Scenario: Pull request validation runs the action
- **WHEN** a pull request workflow runs with required Tailscale secrets available
- **THEN** the workflow invokes the local action in `test` mode against a named fixture

#### Scenario: Pull request report permissions are available
- **WHEN** the pull request workflow invokes the local action
- **THEN** the workflow grants the GitHub token permissions required to create or update the action-owned pull request report comment

### Requirement: Internal workflow demonstrates manual ACL drift
The repository SHALL include an internal workflow scenario that modifies the test tailnet ACL outside the action before running the local action.

#### Scenario: Manual drift is created through the Tailscale API
- **WHEN** the manual-drift workflow scenario runs
- **THEN** it updates the test tailnet ACL directly through the Tailscale API using internal API-key credentials before invoking the local action

#### Scenario: Modified-externally behavior is visible
- **WHEN** the action runs after the manual Tailscale API update and the cached ETag differs from the current control ETag
- **THEN** the workflow output includes the action's modified-externally warning path

#### Scenario: Drift scenario restores expected state
- **WHEN** the manual-drift workflow scenario completes or fails after changing the remote ACL
- **THEN** the workflow attempts to restore a known fixture state for subsequent internal runs

### Requirement: Internal coverage preserves public compatibility
Internal workflow coverage MUST NOT change public action compatibility with `tailscale/gitops-acl-action`.

#### Scenario: Runtime behavior is unchanged
- **WHEN** external users run existing workflows compatible with `tailscale/gitops-acl-action`
- **THEN** the action inputs, auth modes, validation behavior, apply behavior, cache file behavior, ETag calculation, and Tailscale API semantics remain unchanged
