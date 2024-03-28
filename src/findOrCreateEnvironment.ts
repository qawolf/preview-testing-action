import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

export interface EnvironmentCreationResponse {
  data: {
    createEnvironment: {
      branchId: string;
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

type FindOrCreateEnvironmentParams = {
  baseEnvironmentId?: string;
  branch: string;
  log: LogHelper;
  pr?: {
    number: number;
    title: string;
  };
  qawolfApiKey: string;
  qaWolfTeamId: string;
};

export async function findOrCreateEnvironment({
  qawolfApiKey,
  branch,
  pr,
  qaWolfTeamId,
  log,
  baseEnvironmentId,
}: FindOrCreateEnvironmentParams): Promise<string> {
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
    },
  );

  if (retrievalResponse.data.data.environments[0]) {
    const environmentId = retrievalResponse.data.data.environments[0].id;
    log.info(`Environment already exists with ID: ${environmentId}`);
    return environmentId;
  }

  const creationResponse = await axios.post<EnvironmentCreationResponse>(
    qawolfGraphQLEndpoint,
    {
      operationName: "createEnvironment",
      query: `
        mutation createEnvironment($name: String!, $teamId: String!) {
          createEnvironment(name: $name, team_id: $teamId) {
            id
            branchId
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
    },
  );

  log.debug(`Environment response: ${JSON.stringify(creationResponse.data)}`);

  if (!creationResponse.data.data.createEnvironment.id) {
    throw Error("Environment ID not found in response");
  }

  const multiBranchResponse = await axios.post<{
    data: {
      teamBranches: {
        environments: {
          id: string;
        }[];
        id: string;
      }[];
    };
  }>(
    qawolfGraphQLEndpoint,
    {
      query: `
        query teamBranches($teamId: String!) {
          teamBranches(where: { teamId: { equals: $teamId }}) {
            id
            environments{
              id
            }
          }
        }
      `,
      variables: {
        teamId: qaWolfTeamId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const hasMultipleBranches =
    multiBranchResponse.data.data.teamBranches.length > 1;

  if (!hasMultipleBranches) {
    return creationResponse.data.data.createEnvironment.id;
  }

  const sourceEnvironment = await axios.post<{
    data: {
      environment: {
        branchId: string;
        id: string;
      };
    };
  }>(
    qawolfGraphQLEndpoint,
    {
      query: `
        query EnvironmentWithBranch($where: EnvironmentWhereUniqueInput!) {
          environment(where: $where) {
            id
            branchId
          }
        }
      `,
      variables: {
        where: {
          id: baseEnvironmentId,
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const baseBranchId = sourceEnvironment.data.data.environment.branchId;
  const targetBranchId = creationResponse.data.data.createEnvironment.branchId;

  if (!baseBranchId) {
    throw Error("Base branch ID not found in response");
  }

  log.info(
    `Promoting workflows from branch ${baseBranchId} to ${targetBranchId}`,
  );

  const promotionResponse = await axios.post(
    qawolfGraphQLEndpoint,
    {
      query: `
        mutation PromoteWorkflowsToBranch(
          $sourceTeamBranchId: String!
          $targetTeamBranchId: String!
        ) {
          promoteWorkflowsToBranch(
            sourceTeamBranchId: $sourceTeamBranchId
            targetTeamBranchId: $targetTeamBranchId
          )
        }
      `,
      variables: {
        sourceTeamBranchId: baseBranchId,
        targetTeamBranchId: targetBranchId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!promotionResponse.data.data) {
    throw new Error("Promotion failed");
  }

  return creationResponse.data.data.createEnvironment.id;
}
