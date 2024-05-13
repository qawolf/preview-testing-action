import { createEnvironmentAction } from "./createEnvironmentAction";
import { deleteTeamBranchAction } from "./deleteTeamBranchAction";
import { testDeployment } from "./testDeployment";

export type LogHelper = {
  debug: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

type HandleOperationOptions = {
  baseEnvironmentId?: string;
  branch: string;
  commitUrl: string;
  deploymentUrl?: string;
  log: LogHelper;
  pr?: { number: number; title: string };
  qawolfApiKey: string;
  qaWolfTeamId: string;
  repoFullName: string;
  sha: string;
  variables: { [key: string]: string };
};

export async function handleOperation(
  operation: string,
  options: HandleOperationOptions,
) {
  const {
    baseEnvironmentId,
    branch,
    commitUrl,
    deploymentUrl,
    log,
    pr,
    qaWolfTeamId,
    qawolfApiKey,
    repoFullName,
    sha,
    variables: enviromentVariables,
  } = options;

  switch (operation) {
    case "create-environment":
      await createEnvironmentAction({
        baseEnvironmentId,
        branch,
        headRepoFullName: repoFullName,
        log,
        pr,
        qaWolfTeamId,
        qawolfApiKey,
        variables: enviromentVariables,
      });
      break;
    case "delete-environment":
      await deleteTeamBranchAction({
        branchId: branch,
        log,
        qawolfApiKey,
        teamId: qaWolfTeamId,
      });
      break;
    case "run-tests":
      if (!deploymentUrl) {
        throw Error("missing deployment url");
      }
      await testDeployment({
        branch,
        commitUrl,
        deploymentUrl,
        log,
        qawolfApiKey,
        sha,
        variables: enviromentVariables,
      });
      break;
    default:
      throw Error(`invalid operation: ${operation}`);
  }
}
