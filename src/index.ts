import * as core from "@actions/core";
import { Octokit } from "@octokit/action";

import { handleOperation } from "./handleOperation";
import { parseEnvironmentVariablesToJSON } from "./parseEnvironmentVariables";

async function runGitHubAction() {
  try {
    const octokit = new Octokit();
    const operation = core.getInput("operation", { required: true });
    const qawolfApiKey = core.getInput("qawolf-api-key", { required: true });
    const qaWolfTeamId = core.getInput("qawolf-team-id", { required: true });
    const sha = core.getInput("sha", { required: true });
    const deploymentUrl = core.getInput("deployment-url");
    const environmentVariables = core.getInput("variables");
    const baseEnvironmentId = core.getInput("base-environment-id");
    const repoFullName = process.env.GITHUB_REPOSITORY;

    if (!repoFullName) {
      throw Error("missing GITHUB_REPOSITORY");
    }

    const [owner, repo] = repoFullName.split("/");

    if (!owner || !repo) {
      throw Error("invalid repo full name");
    }

    const inputEnvironmentVariablesJSON = environmentVariables
      ? parseEnvironmentVariablesToJSON(environmentVariables)
      : {};

    core.debug(
      `Input environment variables count ${
        Object.keys(inputEnvironmentVariablesJSON).length
      }`,
    );

    const pullRequestsResponse =
      await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        commit_sha: sha,
        owner,
        repo,
      });
    const branchesResponse = await octokit.rest.repos.listBranchesForHeadCommit(
      {
        commit_sha: sha,
        owner,
        repo,
      },
    );

    const pr = pullRequestsResponse.data[0];
    const branch = pr?.head.ref ?? branchesResponse.data[0]?.name;

    if (!pr) {
      core.debug(`No PR found`);
    } else {
      core.debug(
        `Selected pull request from SHA: ${pr.title} ${pr.html_url} ${pr.head.ref}`,
      );
    }

    if (!branch) {
      throw Error(`No branch found for SHA or PR ref: ${sha}`);
    }

    core.debug(`Selected branch from SHA: ${branch}`);

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`;

    await handleOperation(operation, {
      baseEnvironmentId,
      branch,
      commitUrl,
      deploymentUrl,
      log: core,
      pr,
      qaWolfTeamId,
      qawolfApiKey,
      repoFullName,
      sha,
      variables: inputEnvironmentVariablesJSON,
    });
  } catch (error) {
    core.setFailed(
      `Action failed: ${
        typeof error === "object" && error && "message" in error
          ? error.message
          : "Unknown error"
      }`,
    );
  }
}

runGitHubAction();
