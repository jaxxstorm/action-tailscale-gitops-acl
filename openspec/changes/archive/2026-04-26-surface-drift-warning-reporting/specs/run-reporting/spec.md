## MODIFIED Requirements

### Requirement: Pull request policy diff comment

The action SHALL publish an action-owned pull request comment containing a unified diff from the current Tailscale control policy to the local policy file when the run is executing in a pull request context and GitHub API credentials are available.

#### Scenario: Changed policy in pull request validation

- **WHEN** the action runs for a pull request, the local policy differs from the current Tailscale control policy, and a GitHub token is available
- **THEN** the action publishes a pull request comment showing a unified diff from the current control policy to the local policy file

#### Scenario: Repeated pull request validation

- **WHEN** a later run executes for the same pull request after the action has already published its report comment
- **THEN** the action updates the existing action-owned report comment instead of creating a duplicate comment

#### Scenario: No policy diff in pull request validation

- **WHEN** the action runs for a pull request and the local policy matches the current Tailscale control policy
- **THEN** the action publishes or updates the action-owned pull request comment to state that no policy diff is present

#### Scenario: Externally modified policy in pull request validation

- **WHEN** the action runs for a pull request, a GitHub token is available, and the cached ETag differs from the current control ETag
- **THEN** the action-owned pull request comment includes a warning that the policy file was modified externally

### Requirement: Action run summary

The action SHALL write a GitHub Actions job summary that records the result of the run and the relevant policy comparison state.

#### Scenario: Validation succeeds with changes

- **WHEN** the action runs in `test` mode, the local policy differs from the current Tailscale control policy, and Tailscale validation succeeds
- **THEN** the job summary records that validation succeeded and that a policy change was evaluated

#### Scenario: Apply succeeds with changes

- **WHEN** the action runs in `apply` mode, the local policy differs from the current Tailscale control policy, and the policy is applied successfully
- **THEN** the job summary records that apply succeeded and that the policy was updated

#### Scenario: No update needed

- **WHEN** the current Tailscale control policy ETag equals the local policy hash
- **THEN** the job summary records that no update was needed and identifies the run mode

#### Scenario: Run fails

- **WHEN** validation or apply fails
- **THEN** the action attempts to write a job summary that records the failure result before marking the action failed

#### Scenario: Externally modified policy warning

- **WHEN** the cached ETag differs from the current control ETag
- **THEN** the job summary includes a warning that the policy file was modified externally
