# GitHub Action to Sync Tailscale ACLs

This GitHub action lets you manage your [tailnet policy file](https://tailscale.com/kb/1018/acls/) using a
[GitOps](https://about.gitlab.com/topics/gitops/) workflow. With this GitHub
action you can automatically manage your tailnet policy file using a git repository
as your source of truth. 

## Inputs

### `tailnet`

**Required** The name of your tailnet. You can find it by opening [the admin
panel](https://login.tailscale.com/admin) and copying down the name next to the
Tailscale logo in the upper left hand corner of the page.

### `oauth-client-id` and `audience`

**Optional** The ID and audience for a [federated identity](https://tailscale.com/kb/1581/workload-identity-federation)
for your tailnet. The federated identity must have the `policy_file` scope.

Either `api-key`, `oauth-client-id` and `oauth-secret`, or `oauth-client-id` and `audience` are required.

### `api-key`

**Optional** An API key authorized for your tailnet. You can get one [in the
admin panel](https://login.tailscale.com/admin/settings/keys).
Either `api-key`, `oauth-client-id` and `oauth-secret`, or `oauth-client-id` and `audience` are required.

Please note that API keys will expire in 90 days. Set up a monthly event to
rotate your Tailscale API key, or use a trust credential (OAuth client or federated identity).

### `oauth-client-id` and `oauth-secret`

**Optional** The ID and secret for an [OAuth client](https://tailscale.com/kb/1215/oauth-clients)
for your tailnet. The client must have the `policy_file` scope.

Either `api-key`, `oauth-client-id` and `oauth-secret`, or `oauth-client-id` and `audience` are required.

### `policy-file`

**Optional** The path to your policy file in the repository. If not set this
defaults to `policy.hujson` in the root of your repository.

### `action`

**Required** One of `test` or `apply`. If you set `test`, the action will run
ACL tests and not update the ACLs in Tailscale. If you set `apply`, the action
will run ACL tests and then update the ACLs in Tailscale. This enables you to
use pull requests to make changes with CI stopping you from pushing a bad change
out to production.

## Getting Started

Set up a new GitHub repository that will contain your tailnet policy file. Open the [Access Controls page of the admin console](https://login.tailscale.com/admin/acls) and copy your policy file to
a file in that repo called `policy.hujson`.

If you want to change this name to something else, you will need to add the
`policy-file` argument to the `with` blocks in your GitHub Actions config.

Copy this file to `.github/workflows/tailscale.yml`.

```yaml
name: Sync Tailscale ACLs

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  acls:
    permissions:
      contents: read
      id-token: write # This is required for the Tailscale action to request a JWT from GitHub
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - name: Fetch version-cache.json
        uses: actions/cache@v5
        with:
          path: ./version-cache.json
          key: version-cache.json-${{ github.run_id }}
          restore-keys: |
            version-cache.json-

      - name: Deploy ACL
        if: github.event_name == 'push'
        id: deploy-acl
        uses: tailscale/gitops-acl-action@v1
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_ID }}
          audience: ${{ secrets.TS_AUDIENCE }}
          tailnet: ${{ secrets.TS_TAILNET }}
          action: apply

      - name: Test ACL
        if: github.event_name == 'pull_request'
        id: test-acl
        uses: tailscale/gitops-acl-action@v1
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_ID }}
          audience: ${{ secrets.TS_AUDIENCE }}
          tailnet: ${{ secrets.TS_TAILNET }}
          action: test
```

Generate a new federated identity. See [here](https://login.tailscale.com/admin/settings/keys) for instructions.

Then open the secrets settings for your repo and add two secrets:

* `TS_OAUTH_ID`: Your federated identity's client ID
* `TS_AUDIENCE`: Your federated identity's audience
* `TS_TAILNET`: Your tailnet's name (it's next to the logo on the upper
  left-hand corner of the [admin panel](https://login.tailscale.com/admin/machines))

Once you do that, commit the changes and push them to GitHub. You will have CI
automatically test and push changes to your tailnet policy file to Tailscale.

## Developer guide

This action is implemented as a JavaScript action. Install dependencies, run
tests, and rebuild the checked-in action bundle with:

```bash
npm ci
npm test
npm run build
```

The generated `dist/index.js` file is committed so users of the action do not
need to install dependencies at runtime.

## Integration test setup

The repository includes `.github/workflows/integration.yml`, which exercises the
local action with both Tailscale OIDC federated identity credentials and
Tailscale OAuth client credentials. The OIDC job runs `action: test` for pull
requests and `action: apply` for pushes to `main`. The OAuth credentials job
always runs `action: test`, so it verifies the client credentials exchange
without writing the tailnet policy. You can also run the workflow manually with
`workflow_dispatch` and choose the OIDC mode.

The workflow uses `test/fixtures/policy.hujson`. Configure it against a
dedicated test tailnet, because the `apply` path updates that tailnet's policy
file.

To enable the OIDC job:

1. In Tailscale, create a federated identity for this GitHub repository with the
   `policy_file` scope.
2. Configure the identity's subject conditions to trust this repository's GitHub
   Actions OIDC tokens. For pull request and push coverage, allow the repository
   and branch/event subjects you expect to run.
3. Add these GitHub Actions secrets to the repository:
   - `TS_OAUTH_ID`: the federated identity client ID.
   - `TS_AUDIENCE`: the federated identity audience.
   - `TS_TAILNET`: the dedicated test tailnet name.
4. Run the `Integration` workflow manually in `test` mode first.
5. After the test mode passes, run it manually in `apply` mode or merge a change
   to `main` to verify the apply path.

To enable the OAuth credentials job:

1. In Tailscale, create an OAuth client for the same dedicated test tailnet with
   the `policy_file` scope.
2. Add these GitHub Actions secrets to the repository:
   - `TS_OAUTH_CLIENT_ID`: the OAuth client ID.
   - `TS_OAUTH_SECRET`: the OAuth client secret.
   - `TS_TAILNET`: the dedicated test tailnet name.
3. Run the `Integration` workflow. The `OAuth credentials test` job should run
   independently of the OIDC job.

Both integration jobs always run. Missing or invalid credentials fail the
workflow, which keeps credential drift visible in CI.
The jobs run in series, and the workflow has a concurrency group so separate
integration runs do not update the ACL at the same time.
