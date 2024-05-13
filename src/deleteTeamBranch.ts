import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

export async function deleteTeamBranch({
  branchId,
  log,
  qawolfApiKey,
  teamId,
}: {
  branchId: string;
  log: LogHelper;
  qawolfApiKey: string;
  teamId: string;
}) {
  await axios.post(
    qawolfGraphQLEndpoint,
    {
      query: `
        mutation deleteTeamBranch($branchId: String!, $teamId: String!) {
            deleteTeamBranch(data: { branchId: $branchId, teamId: $teamId })
        }
      `,
      variables: {
        branchId,
        teamId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${qawolfApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  log.info(`Branch deleted with ID: ${branchId}`);
}
