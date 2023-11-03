type EnvVarObject = { [key: string]: string };

/**
 * It will parse env variables like this:
 *
 * MY_VAR=1
 * MY_VAR=variable
 *
 * into JSON:
 * {
 *   MY_VAR: "1",
 *   MY_VAR: "variable",
 * }
 */

export const parseEnvironmentVariablesToJSON = (
  environmentVariablesInput: string
): EnvVarObject => {
  return environmentVariablesInput
    .split(/\r?\n/) // Split into lines
    .map((line) => line.split("=")) // Split each line into key-value pairs
    .filter((parts) => parts[0]) // Filter out any lines that don't contain keys
    .reduce((envVars, [key, ...rest]) => {
      if (!key) throw new Error("No key found");
      // Combine the remaining parts back into the value string
      const value = rest.join("=").trim();
      return {
        ...envVars,
        [key.trim()]: value,
      };
    }, {} as EnvVarObject); // Start with an empty object
};
