import { deleteEnvironment } from "./deleteEnvironment";
import { getEnvironmentIdForBranch } from "./getEnvironmentIdForBranch";
import { type LogHelper } from "./handleOperation";

export const deleteEnvironmentAction = async ({
  qawolfApiKey,
  branch,
  log,
}: {
  branch: string;
  log: LogHelper;
  qawolfApiKey: string;
}) => {
  log.info("Retrieving environment ID for deletion...");
  const environmentId = await getEnvironmentIdForBranch(
    qawolfApiKey,
    branch,
    log
  );

  log.info(`Deleting environment with ID: ${environmentId}`);
  await deleteEnvironment(qawolfApiKey, environmentId, log);
};
