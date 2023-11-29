import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

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

interface FindOrCreateTriggerParams {
  branch: string;
  environmentId: string;
  log: LogHelper;
  pr: { number: number; title: string } | undefined;
  qawolfApiKey: string;
  qaWolfTeamId: string;
  repositoryId: string | undefined;
  tags: { id: string }[] | undefined;
}

export async function findOrCreateTrigger(args: FindOrCreateTriggerParams) {
  const {
    branch,
    environmentId,
    log,
    pr,
    qawolfApiKey,
    repositoryId,
    qaWolfTeamId,
    tags,
  } = args;
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
          deleted_at: {
            equals: null,
          },
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
    log.info(
      `Trigger with name ${triggerName} already exists with id ${triggerId} in environment ${environmentId}`
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
          $teamId: ID!,
          $tag_ids: [ID!]
        ) {
          createTrigger(
            codeHostingServiceRepositoryId: $codeHostingServiceRepositoryId,
            deployment_branches: $deploymentBranches,
            deployment_environment: $deploymentEnvironment,
            deployment_provider: $deploymentProvider,
            environment_id: $environmentId,
            name: $name,
            team_id: $teamId,
            tag_ids: $tag_ids
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
        tag_ids: tags?.map((tag) => tag.id),
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

  log.debug(`Trigger response: ${JSON.stringify(creationResponse.data)}`);

  const triggerId = creationResponse.data?.data?.createTrigger?.id;
  if (!triggerId) {
    throw new Error("Trigger ID not found in response");
  }

  log.info(`Trigger created with ID: ${triggerId}`);
  return triggerId;
}
