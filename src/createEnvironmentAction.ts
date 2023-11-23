import { createEnvironmentVariables } from "./createEnvironmentVariables";
import { findOrCreateTrigger } from "./findOrCreateTrigger";
import { findRepositoryIdByName } from "./findRepositoryIdByName";
import { getEnvironmentVariablesFromEnvironment } from "./getEnvironmentVariablesFromEnvironment";
import { getOrCreateEnvironment } from "./getOrCreateEnvironment";
import { getTagsFromGenericTriggerInEnvironment } from "./getTagsFromEnvironment";
import { type LogHelper } from "./handleOperation";

type CreateEnvironmentActionArgs = {
  baseEnvironmentId?: string;
  branch: string;
  headRepoFullName: string;
  log: LogHelper;
  pr?: {
    number: number;
    title: string;
  };
  qawolfApiKey: string;
  qaWolfTeamId: string;
  variables: { [key: string]: string };
};

export const createEnvironmentAction = async ({
  branch,
  headRepoFullName,
  qawolfApiKey,
  qaWolfTeamId,
  pr,
  variables,
  log,
  baseEnvironmentId,
}: CreateEnvironmentActionArgs) => {
  log.info("Creating environment for pull request...");
  const environmentId = await getOrCreateEnvironment({
    branch,
    log,
    pr,
    qaWolfTeamId,
    qawolfApiKey,
  });
  log.info(`Environment created with ID: ${environmentId}`);

  const baseEnvironmentVariablesJSON = baseEnvironmentId
    ? await getEnvironmentVariablesFromEnvironment({
        environmentId: baseEnvironmentId,
        qawolfApiKey,
      })
    : {};

  const combinedEnvironmentVariables = {
    ...baseEnvironmentVariablesJSON,
    ...variables,
  };

  log.info("Creating environment variables...");
  await createEnvironmentVariables({
    environmentId,
    qawolfApiKey,
    variables: combinedEnvironmentVariables,
  });
  log.info(
    `Environment variables created for environment ID: ${environmentId}`
  );

  log.info("Retrieving repository ID...");
  const repositoryId = await findRepositoryIdByName(
    qawolfApiKey,
    headRepoFullName,
    log
  );

  log.info(
    repositoryId
      ? `Repository ID retrieved: ${repositoryId}`
      : "Repository not integrated with QA Wolf, enable it in the settings page to get PR comments and checks."
  );

  const tags = baseEnvironmentId
    ? await getTagsFromGenericTriggerInEnvironment({
        environmentId: baseEnvironmentId,
        qawolfApiKey,
      })
    : undefined;

  log.info(`Tags retrieved: ${tags?.map((tag) => tag.name).join(", ")}`);

  log.info("Creating trigger for deployment...");
  await findOrCreateTrigger({
    branch,
    environmentId,
    log,
    pr,
    qaWolfTeamId,
    qawolfApiKey,
    repositoryId,
    tags,
  });
};
