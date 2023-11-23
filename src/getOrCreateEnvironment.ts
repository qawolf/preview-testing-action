import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

export interface EnvironmentCreationResponse {
  data: {
    createEnvironment: {
      id: string;
    };
  };
}

export interface EnvironmentRetrievalResponse {
  data: {
    environments: Array<{
      id: string;
    }>;
  };
}

type GetOrCreateEnvironmentParams = {
  branch: string;
  log: LogHelper;
  pr?: {
    number: number;
    title: string;
  };
  qawolfApiKey: string;
  qaWolfTeamId: string;
};

export async function getOrCreateEnvironment({
  qawolfApiKey,
  branch,
  pr,
  qaWolfTeamId,
  log,
}: GetOrCreateEnvironmentParams): Promise<string> {
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
          deletedAt: {
            equals: null,
          },
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
    log.info(`Environment already exists with ID: ${environmentId}`);
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

  log.debug(`Environment response: ${JSON.stringify(response.data)}`);

  if (!response.data.data.createEnvironment.id) {
    throw new Error("Environment ID not found in response");
  }

  return response.data.data.createEnvironment.id;
}
