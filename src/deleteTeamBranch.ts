import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

export async function deleteTeamBranch({
  log,
  qawolfApiKey,
  teamBranchId,
  teamId,
}: {
  log: LogHelper;
  qawolfApiKey: string;
  teamBranchId: string;
  teamId: string;
}) {
  const response = await axios.post(
    qawolfGraphQLEndpoint,
    {
      query: `
        mutation deleteTeamBranch($branchId: String!, $teamId: String!) {
            deleteTeamBranch(data: { branchId: $branchId, teamId: $teamId })
        }
      `,
      variables: {
        branchId: teamBranchId,
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

  if (response.data.errors) {
    log.error(`Team branch removal failed.`);
    throw Error("Team branch removal failed.");
  }

  log.info(`Branch deleted with ID: ${teamBranchId}`);
}
