import { describe } from "vitest";

function isEnabled(value: string | undefined) {
  return ["1", "true"].includes((value ?? "").toLowerCase());
}

const runLiveIntegrationTests = isEnabled(process.env.RUN_LIVE_INTEGRATION_TESTS);
const runAuthIntegrationTests = isEnabled(process.env.RUN_AUTH_INTEGRATION_TESTS);

type IntegrationDescribe = typeof describe.sequential;

export const describeInfrastructureIntegration: IntegrationDescribe =
  runLiveIntegrationTests ? describe.sequential : describe.skip;

export const describeAuthIntegration: IntegrationDescribe =
  runLiveIntegrationTests && runAuthIntegrationTests
    ? describe.sequential
    : describe.skip;
