import { loadEnv } from "ldenv";
loadEnv();

import { createConfig } from "fuels";

// If your node is running on a port other than 4000, you can set it here
const fuelCorePort = +(process.env.FUEL_NODE_PORT as string) || 4000;
const providerUrl =
  (process.env.FUEL_NODE_URL as string) ||
  `http://127.0.0.1:${fuelCorePort}/v1/graphql`;

export default createConfig({
  workspace: "./", // Path to your Sway workspace
  output: "./typescript/src", // Where your generated types will be saved
  fuelCorePort,
  providerUrl,
});
