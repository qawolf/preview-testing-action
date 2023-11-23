import axios from "axios";

import { qawolfDeploySuccessEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

type TestDeploymentParams = {
  branch: string;
  commitUrl: string;
  deploymentUrl: string;
  log: LogHelper;
  qawolfApiKey: string;
  sha: string;
  variables: { [key: string]: string };
};

export async function testDeployment({
  qawolfApiKey,
  branch,
  commitUrl,
  sha,
  deploymentUrl,
  variables,
  log,
}: TestDeploymentParams) {
  const response = await axios.post(
    qawolfDeploySuccessEndpoint,
    {
      branch: branch,
      commit_url: commitUrl,
      deployment_type: "qawolf-preview",
      deployment_url: deploymentUrl,
      sha,
      variables: {
        ...variables,
        URL: deploymentUrl,
      },
    },
    {
      headers: {
        Authorization: qawolfApiKey,
        "Content-Type": "application/json",
      },
    }
  );

  log.info(`Triggered QA Wolf tests: ${response.data}`);
}
