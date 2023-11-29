# QA Wolf Preview Environment Testing Action

GitHub action to summon the wolfpack to test your preview environments.

## Usage for testing PRs

The flow is simple, create a environment for the PR before you start testing, run tests when the preview environment is ready, delete the environment when the PR is merged just closed.

### GitHub secrets and variables

The action will require the QA Wolf API Key and your QA Wolf Team ID. Set those as GitHub secret and action respectively.

#### Environment variables

You can set environment variables as a secret in this format:
```sh
MY_FOO=bar
MY_BAZ=qux
```

Alternatively, you can provide the `base-environment-id` and environment variables are going to be derived from that. You can get the environment id by accessing it in the platform and getting it from the URL https://app.qawolf.com/your-team/environments/<ENVIRONMENT_ID>.

### Creating the environment

Create the environment for the PR using a job like this. Possibly before the first deployment.

```yml
jobs:
  create-pr-environment:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - name: Create QA Wolf environment
        uses: qawolf/preview-testing-action@v0.1.7-beta
        env:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        with:
          qawolf-api-key: "${{ secrets.QAWOLF_API_KEY }}"
          qawolf-team-id: "${{ vars.QAWOLF_TEAM_ID }}"
          base-environment-id: "${{ vars.QAWOLF_BASE_ENVIRONMENT_ID }}"
          sha: "${{ github.event.pull_request.head.sha }}"
          operation: "create-environment"
```

### Running tests

When your preview environment is ready, trigger a test run by sending a request to our API.

```sh
curl -X POST https://app.qawolf.com/api/webhooks/deploy_success\
     -H "Authorization: <API_KEY>"\
     -H "Content-Type: application/json"\
     --d '{
            "branch": <PR branch>,
            "commit_url": "https://github.com/<Organization>/<Repository>/commit/<Commit SHA>",
            "deployment_type": "qawolf-preview",
            "deployment_url": <Preview environment URL>,
            "sha": <Commit SHA>,
            "variables": {
              "URL": <Preview environment URL>
            }
          }'
```

Alternatively, you can use a GitHub action.

```yml
name: Deploy and Test Preview Environment

jobs:
  deploy-preview-environmnent:
    name: Your custom job to deploy a preview environment
    uses: ./your-custom-action
  trigger-preview-testing:
    needs: deploy-preview-environmnent
    name: Trigger QA Wolf preview testing
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - name: Test preview environment
        uses: qawolf/preview-testing-action@v0.1.7-beta
        env:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        with:
          qawolf-api-key: "${{ secrets.QAWOLF_API_KEY }}"
          qawolf-team-id: "${{ secrets.QAWOLF_TEAM_ID }}"
          sha: "${{ github.event.pull_request.head.sha }}"
          deployment-url: ${{ needs.deploy-preview-environmnent.outputs.preview-url }}
          operation: "run-tests"
```

### Deleting the environment

We want to delete the environment at some point, usually, when the PR is closed.

```yml
name: Delete QA Wolf PR testing environment

on:
  pull_request:
    types: [closed]

jobs:
  delete-pr-environment:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - name: Delete PR testing environment
        uses: qawolf/preview-testing-action@v0.1.7-beta
        env:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        with:
          qawolf-api-key: "${{ secrets.QA_WOLF_API_KEY }}"
          qawolf-team-id: "${{ secrets.QA_WOLF_TEAM_ID }}"
          sha: "${{ github.event.pull_request.head.sha }}"
          operation: "delete-environment"
```
