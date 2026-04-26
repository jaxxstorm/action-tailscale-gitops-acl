## ADDED Requirements

### Requirement: Internal pull request reporting coverage
The repository SHALL include internal pull request workflow coverage for the action-owned pull request report behavior.

#### Scenario: Pull request workflow can publish report comment
- **WHEN** an internal pull request workflow invokes the local action with a GitHub token and a changed policy fixture
- **THEN** the action publishes or updates the action-owned pull request report comment with policy comparison output

#### Scenario: Pull request workflow can report no diff
- **WHEN** an internal pull request workflow invokes the local action with a fixture matching the current control policy
- **THEN** the action publishes or updates the action-owned pull request report comment to state that no policy diff is present

#### Scenario: Reporting coverage remains best-effort
- **WHEN** internal pull request report publication fails because GitHub token permissions or event context are unavailable
- **THEN** the workflow preserves the action's validation result and surfaces the reporting failure in logs
