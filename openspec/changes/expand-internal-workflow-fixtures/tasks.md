## 1. Fixtures

- [x] 1.1 Audit the existing `test/fixtures/policy.hujson` content and decide which scenario it represents.
- [x] 1.2 Add named fixtures for no-op, changed-policy, and manual-drift scenarios under `test/fixtures/`.
- [x] 1.3 Update any workflow references that assume `test/fixtures/policy.hujson` is the only policy fixture.

## 2. Pull Request Workflow Coverage

- [x] 2.1 Update the pull request workflow permissions so the local action can create or update its action-owned PR report comment.
- [x] 2.2 Add pull request workflow steps or a job that builds the local action and invokes it in `test` mode against named fixtures when required secrets are available.
- [x] 2.3 Ensure PR workflow coverage remains skipped or harmless for contexts where Tailscale secrets are unavailable.

## 3. Integration Workflow Drift Scenario

- [x] 3.1 Add a workflow step that applies a known baseline fixture to the test tailnet before drift setup.
- [x] 3.2 Add a workflow step that manually modifies the test tailnet ACL through the Tailscale API using internal API-key credentials.
- [x] 3.3 Run the local action after the manual API update with a cache state that exposes the modified-externally warning path.
- [x] 3.4 Add an `always()` cleanup or restore step that attempts to put the test tailnet back to the expected fixture state.

## 4. Verification

- [x] 4.1 Run local YAML or syntax checks available in the repository for changed workflows.
- [x] 4.2 Run `npm test` to ensure unit behavior remains unchanged.
- [x] 4.3 Run `npm run build` if TypeScript or bundled action output changes.
- [x] 4.4 Document any live workflow verification that cannot be run locally and the secrets required to exercise it in GitHub Actions.
