import { deleteTeamBranch } from "./deleteTeamBranch";
import { type LogHelper } from "./handleOperation";

export const deleteTeamBranchAction = async ({
  qawolfApiKey,
  branchId,
  log,
  teamId,
}: {
  branchId: string;
  log: LogHelper;
  qawolfApiKey: string;
  teamId: string;
}) => {
  log.info(`Deleting branch with ID: ${branchId}`);
  await deleteTeamBranch({ branchId, log, qawolfApiKey, teamId });
};
