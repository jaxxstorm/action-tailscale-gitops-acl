## Context

The action currently logs control, local, and cache ETags, validates or applies the policy, and writes the cache file. It does not emit a GitHub Actions job summary, and it does not publish pull request review context beyond normal workflow logs.

The action already fetches the current Tailscale ACL from `GET /api/v2/tailnet/{tailnet}/acl` to read the control ETag. That response can also provide the current policy body, which is the natural comparison base for a review diff. Reporting must remain additive so upstream-compatible inputs, auth modes, validation, apply behavior, cache files, and ETag handling stay unchanged.

## Goals / Non-Goals

**Goals:**

- Publish a concise job summary for every action run outcome.
- In pull request validation contexts, publish a comment containing the policy diff being evaluated.
- Reuse the existing ACL fetch path for diff source data where possible.
- Keep report publishing best-effort so reporting failures do not change policy validation or apply results.

**Non-Goals:**

- Changing policy formatting, standardization, hashing, ETag compatibility, or cache semantics.
- Changing Tailscale auth behavior or adding a required GitHub token input.
- Replacing GitHub's normal PR file diff.
- Posting comments outside pull request contexts.

## Decisions

1. Return ACL body with the control ETag from the existing Tailscale ACL read.

   Rationale: the action already performs this request before deciding whether work is needed. Extending the return value avoids an extra API call and keeps the current control policy available for diffing. Alternative considered: add a second `getACL()` request only for PR comments. That is simpler to isolate, but it adds latency and another failure mode.

2. Generate a deterministic unified diff from current control policy to local policy.

   Rationale: a unified diff is compact, familiar to humans and review agents, and maps directly to "what will change". The diff should compare policy text as Tailscale currently serves it against the local file text that apply mode would submit. Alternative considered: diff standardized HuJSON. That can be useful for validation, but it may hide raw-file changes that apply mode would send.

3. Publish PR comments only when the run is in a pull request context and a GitHub token is available.

   Rationale: pull request comments require repository write permissions through the GitHub API. To preserve compatibility, the action should use the ambient `GITHUB_TOKEN` when available and skip commenting with a summary/log note when it is unavailable. Alternative considered: adding a required token input. That would be a breaking workflow requirement.

4. Upsert a single action-owned PR comment using a stable hidden marker.

   Rationale: repeated workflow runs should update the previous report instead of spamming the PR. A hidden marker makes the comment identifiable without affecting visible review content. Alternative considered: always creating a new comment. That provides history but creates noisy PRs.

5. Use `$GITHUB_STEP_SUMMARY` through `@actions/core.summary` for run summaries.

   Rationale: the repository already depends on `@actions/core`, and the toolkit summary API is the intended GitHub Actions interface. Summary writing should be attempted for success, skip, validation failure, and unexpected failure outcomes. Alternative considered: writing the file directly. That would duplicate toolkit behavior already provided by the dependency.

## Risks / Trade-offs

- [Risk] Pull request comments can fail due to missing token permissions or fork restrictions. -> Mitigation: treat comment publishing as best-effort and include the skipped/failed reporting status in logs or the job summary.
- [Risk] Large ACL diffs can produce oversized comments. -> Mitigation: cap the visible diff and include a truncation note while still reporting the run result.
- [Risk] Summary publishing during failure handling can obscure the original failure if it throws. -> Mitigation: catch summary/comment errors and preserve the original validation or runtime failure.
- [Risk] Raw policy diffs may include sensitive policy structure. -> Mitigation: only post to the same PR where the policy file diff is already reviewable, and avoid adding any secrets, auth headers, or API response metadata to comments.
