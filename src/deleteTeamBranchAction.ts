import { deleteTeamBranch } from "./deleteTeamBranch";
import { getBranchIdIdForGitBranch as getTeamBranchIdForGitBranch } from "./getEnvironmentIdForBranch";
import { type LogHelper } from "./handleOperation";

export const deleteTeamBranchAction = async ({
  qawolfApiKey,
  gitBranch,
  log,
  teamId,
}: {
  gitBranch: string;
  log: LogHelper;
  qawolfApiKey: string;
  teamId: string;
}) => {
  log.info(`Deleting team branch for git branch ${gitBranch}`);
  const teamBranchId = await getTeamBranchIdForGitBranch({
    gitBranch,
    log,
    qawolfApiKey,
  });
  await deleteTeamBranch({ log, qawolfApiKey, teamBranchId, teamId });
};
