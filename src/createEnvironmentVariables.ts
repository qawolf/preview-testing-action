import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";

export async function createEnvironmentVariables({
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
