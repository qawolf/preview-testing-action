import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";

interface GenericTriggerTagsFromEnvironmentResponse {
  data: {
    environment: {
      id: string;
      triggers: {
        id: string;
        tags: {
          id: string;
          name: string;
        }[];
      }[];
    };
  };
}

export async function getTagsFromGenericTriggerInEnvironment({
  qawolfApiKey,
  environmentId,
}: {
  environmentId: string;
  qawolfApiKey: string;
}) {
  const retrievalResponse =
    await axios.post<GenericTriggerTagsFromEnvironmentResponse>(
      qawolfGraphQLEndpoint,
      {
        query: `query GenericTriggerTagsFromEnvironment($where: EnvironmentWhereUniqueInput!) {
          environment(where: $where) {
            id
            triggers(where: {deleted_at: {equals: null}, deployment_provider: {equals: "generic"}}) {
              id
              tags {
                id
                name
              }
            }
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
    throw Error(
      `Environment not found with ID: ${environmentId}. Please check the environment ID is correct.`,
    );
  }

  return retrievalResponse.data.data.environment.triggers[0]?.tags?.map(
    (tag) => tag,
  );
}
