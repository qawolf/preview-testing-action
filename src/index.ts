import * as core from "@actions/core";
import { Octokit } from "@octokit/action";
import axios from "axios";

import { parseEnvironmentVariablesToJSON } from "./parseEnvironmentVariables";

const qawolfBaseUrl = "https://app.qawolf.com";
const qawolfGraphQLEndpoint = `${qawolfBaseUrl}/api/graphql`;
const qawolfDeploySuccessEndpoint = `${qawolfBaseUrl}/api/webhooks/deploy_success`;

interface EnvironmentRetrievalResponse {
  data: {
    environments: Array<{
      id: string;
    }>;
  };
}

interface EnvironmentCreationResponse {
  data: {
    createEnvironment: {
      id: string;
    };
  };
}

interface TriggerCreationResponse {
  data: {
    createTrigger: {
      id: string;
    };
  };
}

interface TriggerRetrievalResponse {
  data: {
    triggers: Array<{
      environment_id: string;
      id: string;
    }>;
  };
}

interface RepositoryResponse {
  data: {
    codeHostingServiceRepositories: Array<{
      id: string;
    }>;
  };
}

async function getOrCreateEnvironment({
  qawolfApiKey,
  branch,
  pr,
  qaWolfTeamId,
}: {
  branch: string;
  pr?: {
    number: number;
    title: string;
  };
  qawolfApiKey: string;
  qaWolfTeamId: string;
}): Promise<string> {
  const retrievalResponse = await axios.post<EnvironmentRetrievalResponse>(
    qawolfGraphQLEndpoint,
    {
      query: `
      query Environments($where: EnvironmentWhereInput) {
        environments(where: $where) {
          id
        }
      }
      `,
      variables: {
        where: {
          name: {
            equals: pr
              ? `[PR] #${pr.number} - ${pr.title}`
              : `[Preview] ${branch}`,
          },
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (retrievalResponse.data.data.environments[0]) {
    const environmentId = retrievalResponse.data.data.environments[0].id;
    core.info(`Environment already exists with ID: ${environmentId}`);
    return environmentId;
  }

  const response = await axios.post<EnvironmentCreationResponse>(
    qawolfGraphQLEndpoint,
    {
      operationName: "createEnvironment",
      query: `
        mutation createEnvironment($name: String!, $teamId: String!) {
          createEnvironment(name: $name, team_id: $teamId) {
            id
          }
        }
      `,
      variables: {
        name: pr ? `[PR] #${pr.number} - ${pr.title}` : `[Preview] ${branch}`,
        teamId: qaWolfTeamId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  core.debug(`Environment response: ${JSON.stringify(response.data)}`);

  if (!response.data.data.createEnvironment.id) {
    throw new Error("Environment ID not found in response");
  }

  return response.data.data.createEnvironment.id;
}

async function createEnvironmentVariables({
  environmentId,
  variables,
  qawolfApiKey,
}: {
  environmentId: string;
  qawolfApiKey: string;
  variables: { [key: string]: string };
}) {
  const environmentVariableRequests = Object.keys(variables).map(
    async (key) => {
      const value = variables[key];
      return axios.post(
        qawolfGraphQLEndpoint,
        {
          query: `mutation UpsertEnvironmentVariable($environmentId: ID!, $value: String!, $name: String) {
            upsertEnvironmentVariable(environment_id: $environmentId, value: $value, name: $name) {
              id
            }
          }`,
          variables: {
            environmentId,
            name: key,
            value,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${qawolfApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
    }
  );

  return Promise.all(environmentVariableRequests);
}

async function findRepositoryIdByName(
  qawolfApiKey: string,
  headRepoFullName: string
): Promise<string | undefined> {
  const response = await axios.post<RepositoryResponse>(
    qawolfGraphQLEndpoint,
    {
      query: `
        query codeHostingServiceRepositories($where: CodeHostingServiceRepositoryWhereInput) {
          codeHostingServiceRepositories(where: $where) {
            id
          }
        }
      `,
      variables: {
        where: {
          externalFullName: {
            equals: headRepoFullName,
          },
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );
  core.debug(`Repository response: ${JSON.stringify(response.data)}`);

  const repositories = response.data.data.codeHostingServiceRepositories;
  if (!repositories[0]) {
    return;
  }

  return repositories[0].id;
}

async function findOrCreateTrigger(
  qawolfApiKey: string,
  repositoryId: string | undefined,
  branch: string,
  pr: { number: number; title: string } | undefined,
  environmentId: string,
  teamId: string
) {
  const triggerName = `Deployments of ${
    pr ? `PR #${pr.number} - ${pr.title}` : `branch ${branch}`
  }`;
  const retrievalResponse = await axios.post<TriggerRetrievalResponse>(
    qawolfGraphQLEndpoint,
    {
      query: `query getTriggersForBranch($where: TriggerWhereInput) {
        triggers(where: $where) {
          environment_id
          id
        }
      }
      `,
      variables: {
        where: {
          environment_id: {
            equals: environmentId,
          },
          name: {
            equals: triggerName,
          },
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (retrievalResponse.data.data.triggers[0]) {
    const triggerId = retrievalResponse.data.data.triggers[0].id;
    const environmentId = retrievalResponse.data.data.triggers[0];
    core.info(
      `Trigger with name already exists with id ${triggerId} in environment ${environmentId}`
    );
    return triggerId;
  }

  const creationResponse = await axios.post<TriggerCreationResponse>(
    qawolfGraphQLEndpoint,
    {
      operationName: "createTrigger",
      query: `
        mutation createTrigger(
          $codeHostingServiceRepositoryId: ID!,
          $deploymentBranches: String!,
          $deploymentEnvironment: String!,
          $deploymentProvider: String!,
          $environmentId: ID!,
          $name: String!,
          $teamId: ID!
        ) {
          createTrigger(
            codeHostingServiceRepositoryId: $codeHostingServiceRepositoryId,
            deployment_branches: $deploymentBranches,
            deployment_environment: $deploymentEnvironment,
            deployment_provider: $deploymentProvider,
            environment_id: $environmentId,
            name: $name,
            team_id: $teamId
          ) {
            id
            __typename
          }
        }
      `,
      variables: {
        codeHostingServiceRepositoryId: repositoryId,
        deploymentBranches: branch,
        deploymentEnvironment: "qawolf-preview",
        deploymentProvider: "generic",
        environmentId: environmentId,
        name: triggerName,
        teamId: teamId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  core.debug(`Trigger response: ${JSON.stringify(creationResponse.data)}`);

  const triggerId = creationResponse.data?.data?.createTrigger?.id;
  if (!triggerId) {
    throw new Error("Trigger ID not found in response");
  }

  core.info(`Trigger created with ID: ${triggerId}`);
  return triggerId;
}
async function getEnvironmentIdForBranch(
  qawolfApiKey: string,
  branch: string
): Promise<string> {
  const response = await axios.post(
    qawolfGraphQLEndpoint,
    {
      query: `
        query getTriggersForBranch($where: TriggerWhereInput) {
          triggers(where: $where) {
            id
            environment_id
          }
        }
      `,
      variables: {
        where: {
          deployment_branches: {
            contains: branch,
          },
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  core.debug(`Trigger response: ${JSON.stringify(response.data)}`);

  const triggers = response.data?.data?.triggers;
  if (!triggers || triggers.length === 0) {
    throw new Error(`No environment found for branch: ${branch}`);
  }

  return triggers[0].environment_id;
}

async function deleteEnvironment(qawolfApiKey: string, environmentId: string) {
  await axios.post(
    qawolfGraphQLEndpoint,
    {
      query: `
        mutation deleteEnvironment($environmentId: ID!) {
          deleteEnvironment(environment_id: $environmentId) {
            id
          }
        }
      `,
      variables: {
        environmentId: environmentId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  core.info(`Environment deleted with ID: ${environmentId}`);
}

const createEnvironmentAction = async ({
  branch,
  headRepoFullName,
  qawolfApiKey,
  qaWolfTeamId,
  pr,
  variables,
}: {
  branch: string;
  headRepoFullName: string;
  pr?: {
    number: number;
    title: string;
  };
  qawolfApiKey: string;
  qaWolfTeamId: string;
  variables: { [key: string]: string };
}) => {
  core.info("Creating environment for pull request...");
  const environmentId = await getOrCreateEnvironment({
    branch,
    pr,
    qaWolfTeamId,
    qawolfApiKey,
  });
  core.setOutput("environment_id", environmentId);
  core.info(`Environment created with ID: ${environmentId}`);

  core.info("Creating environment variables...");
  await createEnvironmentVariables({
    environmentId,
    qawolfApiKey,
    variables,
  });
  core.info(
    `Environment variables created for environment ID: ${environmentId}`
  );

  core.info("Retrieving repository ID...");
  const repositoryId = await findRepositoryIdByName(
    qawolfApiKey,
    headRepoFullName
  );

  core.info(
    repositoryId
      ? `Repository ID retrieved: ${repositoryId}`
      : "Repository not integrated with QA Wolf, enable it in the settings page to get PR comments and checks."
  );

  core.info("Creating trigger for deployment...");
  await findOrCreateTrigger(
    qawolfApiKey,
    repositoryId,
    branch,
    pr,
    environmentId,
    qaWolfTeamId
  );
};

const deleteEnvironmentAction = async ({
  qawolfApiKey,
  branch,
}: {
  branch: string;
  qawolfApiKey: string;
}) => {
  core.info("Retrieving environment ID for deletion...");
  const environmentId = await getEnvironmentIdForBranch(qawolfApiKey, branch);

  core.info(`Deleting environment with ID: ${environmentId}`);
  await deleteEnvironment(qawolfApiKey, environmentId);
};

async function testDeployment({
  qawolfApiKey,
  branch,
  commitUrl,
  sha,
  deploymentUrl,
  variables,
}: {
  branch: string;
  commitUrl: string;
  deploymentUrl: string;
  qawolfApiKey: string;
  sha: string;
  variables: { [key: string]: string };
}) {
  const response = await axios.post(
    qawolfDeploySuccessEndpoint,
    {
      branch: branch,
      commit_url: commitUrl,
      deployment_type: "qawolf-preview",
      deployment_url: deploymentUrl,
      sha,
      variables: {
        ...variables,
        URL: deploymentUrl,
      },
    },
    {
      headers: {
        Authorization: qawolfApiKey,
        "Content-Type": "application/json",
      },
    }
  );

  core.info(`Triggered QA Wolf tests: ${response.data}`);
}

async function run() {
  try {
    const octokit = new Octokit();
    const operation = core.getInput("operation", { required: true });
    const qawolfApiKey = core.getInput("qawolf-api-key", { required: true });
    const qaWolfTeamId = core.getInput("qawolf-team-id", { required: true });
    const sha = core.getInput("sha", { required: true });
    const deploymentUrl = core.getInput("deployment-url");
    const environmentVariables = core.getInput("variables");
    const environmentVariablesJSON = environmentVariables
      ? parseEnvironmentVariablesToJSON(environmentVariables)
      : {};
    const repoFullName = process.env.GITHUB_REPOSITORY;

    if (!repoFullName) {
      throw new Error("missing GITHUB_REPOSITORY");
    }

    const [owner, repo] = repoFullName.split("/");

    if (!owner || !repo) {
      throw new Error("invalid repo full name");
    }

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
      }
    );

    const pr = pullRequestsResponse.data[0];
    const branch = branchesResponse.data[0]?.name ?? pr?.head.ref;

    if (!pr) {
      core.debug(`No PR found`);
    } else {
      core.debug(
        `Selected pull request from SHA: ${pr.title} ${pr.html_url} ${pr.head.ref}`
      );
    }

    if (!branch) {
      throw new Error(`No branch found for SHA or PR ref: ${sha}`);
    }

    core.debug(`Selected branch from SHA: ${branch}`);

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`;

    switch (operation) {
      case "create-environment":
        await createEnvironmentAction({
          branch: branch,
          headRepoFullName: repoFullName,
          pr,
          qaWolfTeamId,
          qawolfApiKey,
          variables: environmentVariablesJSON,
        });
        break;
      case "delete-environment":
        await deleteEnvironmentAction({ branch, qawolfApiKey });
        break;
      case "run-tests":
        await testDeployment({
          branch,
          commitUrl,
          deploymentUrl,
          qawolfApiKey,
          sha,
          variables: environmentVariablesJSON,
        });
        break;
      default:
        throw new Error(`invalid operation: ${operation}`);
    }
  } catch (error) {
    core.setFailed(
      `Action failed: ${
        typeof error === "object" && error && "message" in error
          ? error.message
          : "Unknown error"
      }`
    );
  }
}

run();
