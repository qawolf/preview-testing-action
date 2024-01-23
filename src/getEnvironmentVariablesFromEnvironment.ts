import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";

interface EnvironmentVariablesRetrievalResponse {
  data: {
    environment: {
      id: string;
      variablesJSON: string;
    };
  };
}

export async function getEnvironmentVariablesFromEnvironment({
  qawolfApiKey,
  environmentId,
}: {
  environmentId: string;
  qawolfApiKey: string;
}) {
  const retrievalResponse =
    await axios.post<EnvironmentVariablesRetrievalResponse>(
      qawolfGraphQLEndpoint,
      {
        query: `query EnvironmentVariables($where: EnvironmentWhereUniqueInput!) {
          environment(where: $where) {
            id
            variablesJSON
          }
        }`,
        variables: {
          where: {
            id: environmentId,
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

  if (!retrievalResponse.data.data.environment) {
    throw new Error(
      `Environment not found with ID: ${environmentId}. Please check the environment ID is correct.`,
    );
  }

  return JSON.parse(retrievalResponse.data.data.environment.variablesJSON);
}
