import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

export async function deleteEnvironment(
  qawolfApiKey: string,
  environmentId: string,
  log: LogHelper,
) {
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
        environmentId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  log.info(`Environment deleted with ID: ${environmentId}`);
}
