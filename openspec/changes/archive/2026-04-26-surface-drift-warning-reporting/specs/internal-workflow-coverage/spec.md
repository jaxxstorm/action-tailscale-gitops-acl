## MODIFIED Requirements

### Requirement: Pull request workflows exercise the local action

The repository SHALL run the local action in a pull request workflow using GitHub permissions and token context sufficient for pull request report publication.

#### Scenario: Pull request validation runs the action

- **WHEN** a pull request workflow runs with required Tailscale secrets available
- **THEN** the workflow invokes the local action in `test` mode against a named fixture

#### Scenario: Pull request report permissions are available

- **WHEN** the pull request workflow invokes the local action
- **THEN** the workflow grants the GitHub token permissions required to create or update the action-owned pull request report comment

#### Scenario: Pull request report token is provided

- **WHEN** the pull request workflow invokes the local action and expects pull request report publication
- **THEN** the workflow provides `GITHUB_TOKEN` or `GH_TOKEN` in the local action step environment
