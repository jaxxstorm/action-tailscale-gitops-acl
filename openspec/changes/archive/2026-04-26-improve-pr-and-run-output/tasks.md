## 1. ACL Read Context

- [x] 1.1 Update `TailscaleClient` to return both the current ACL ETag and policy body from the existing ACL GET request.
- [x] 1.2 Update `run()` to use the ACL read result without changing local hash calculation, cache comparison, or apply `If-Match` behavior.
- [x] 1.3 Add or update tests proving ACL reads still use the same endpoint and existing ETag behavior is preserved.

## 2. Diff Generation

- [x] 2.1 Add a deterministic unified diff utility for comparing current control policy text with the local policy file.
- [x] 2.2 Handle identical policies by producing an explicit no-diff result.
- [x] 2.3 Add tests for changed, unchanged, and truncated diff output.

## 3. Pull Request Comment Reporting

- [x] 3.1 Detect pull request context from the GitHub Actions event payload and repository environment.
- [x] 3.2 Publish or update a single action-owned pull request comment using the ambient GitHub token when available.
- [x] 3.3 Skip PR comment publishing outside pull request contexts or when credentials are unavailable, while logging the reason.
- [x] 3.4 Add tests for create, update, skip, and reporting-failure paths without changing the action result.

## 4. Job Summary Reporting

- [x] 4.1 Add a run result model that records mode, tailnet, policy file, policy comparison state, and final outcome.
- [x] 4.2 Write a GitHub Actions job summary for validation success, apply success, no-op, and failure outcomes.
- [x] 4.3 Ensure summary-writing failures are logged and do not mask the original action result.
- [x] 4.4 Add tests for summary content across success, no-op, and failure paths.

## 5. Integration and Build

- [x] 5.1 Wire reporting into `run()` so comments and summaries are attempted after the relevant outcome is known.
- [x] 5.2 Verify existing auth modes, action modes, cache file writes, and ETag comparisons remain compatible.
- [x] 5.3 Run `npm test` and `npm run typecheck`.
- [x] 5.4 Run `npm run build` so checked-in `dist/` stays current.
