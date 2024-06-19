import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

export async function getBranchIdIdForGitBranch({
  gitBranch,
  log,
  qawolfApiKey,
}: {
  gitBranch: string;
  log: LogHelper;
  qawolfApiKey: string;
}): Promise<string> {
  const response = await axios.post(
    qawolfGraphQLEndpoint,
    {
      query: `
        query getTriggersForBranch($where: TriggerWhereInput) {
          triggers(where: $where) {
            id
            environment {
              branchId
            }
          }
        }
      `,
      variables: {
        where: {
          deployment_branches: {
            equals: gitBranch,
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
    throw Error(`No trigger found for git branch ${gitBranch}`);
  }

  return triggers[0].environment.branchId;
}
