import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

export async function getEnvironmentIdForBranch(
  qawolfApiKey: string,
  branch: string,
  log: LogHelper,
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
    },
  );

  log.debug(`Trigger response: ${JSON.stringify(response.data)}`);

  const triggers = response.data?.data?.triggers;
  if (!triggers || triggers.length === 0) {
    throw new Error(`No environment found for branch: ${branch}`);
  }

  return triggers[0].environment_id;
}
