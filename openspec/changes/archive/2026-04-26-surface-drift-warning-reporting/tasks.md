## 1. Reporting Model

- [x] 1.1 Add warning state to `RunReport` so externally modified ACL detection can be carried into renderers.
- [x] 1.2 Set the warning state in `run()` when the cached ETag differs from the current control ETag.
- [x] 1.3 Preserve the existing GitHub Actions warning annotation behavior.

## 2. Summary and Pull Request Output

- [x] 2.1 Render report warnings in the GitHub Actions job summary.
- [x] 2.2 Render report warnings in the action-owned pull request comment.
- [x] 2.3 Add or update reporting tests for summary and pull request warning output.

## 3. Workflow Token Wiring

- [x] 3.1 Pass `GITHUB_TOKEN` to internal pull request workflow local-action steps that expect PR reporting.
- [x] 3.2 Pass `GITHUB_TOKEN` to integration workflow local-action steps that can run in pull request context.
- [x] 3.3 Keep workflow live-action steps guarded for unavailable secrets or unsafe fork contexts.

## 4. Verification

- [x] 4.1 Run local YAML or syntax checks available in the repository for changed workflows.
- [x] 4.2 Run `npm test` to verify reporting behavior and existing action behavior.
- [x] 4.3 Run `npm run build` so `dist/` stays current after TypeScript changes.
- [x] 4.4 Document any live GitHub Actions behavior that cannot be fully verified locally.
