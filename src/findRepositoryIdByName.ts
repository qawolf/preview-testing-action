import axios from "axios";

import { qawolfGraphQLEndpoint } from "./constants";
import { type LogHelper } from "./handleOperation";

interface RepositoryResponse {
  data: {
    codeHostingServiceRepositories: Array<{
      id: string;
    }>;
  };
}

export async function findRepositoryIdByName(
  qawolfApiKey: string,
  headRepoFullName: string,
  log: LogHelper,
): Promise<string | undefined> {
  const response = await axios.post<RepositoryResponse>(
    qawolfGraphQLEndpoint,
    {
      query: `
        query codeHostingServiceRepositories($where: CodeHostingServiceRepositoryWhereInput) {
          codeHostingServiceRepositories(where: $where) {
            id
          }
        }
      `,
      variables: {
        where: {
          externalFullName: {
            equals: headRepoFullName,
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
  log.debug(`Repository response: ${JSON.stringify(response.data)}`);

  const repositories = response.data.data.codeHostingServiceRepositories;
  if (!repositories[0]) {
    return;
  }

  return repositories[0].id;
}
