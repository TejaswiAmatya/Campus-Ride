import fs from "node:fs";
import path from "node:path";

const infraCriticalTests = [
  "src/middleware/auth.integration.test.ts",
  "src/middleware/error.integration.test.ts",
  "src/middleware/upload.integration.test.ts",
  "src/config/service.integration.test.ts",
  "src/config/router.integration.test.ts",
  "src/config/redis.integration.test.ts",
  "src/lib/supabase.integration.test.ts",
  "src/lib/notify.integration.test.ts",
  "src/lib/emailQueue.integration.test.ts",
  "src/lib/socket.integration.test.ts",
  "src/workers/emailWorkers.integration.test.ts",
];

const authCriticalTests = [
  "src/users/users.integration.test.ts",
  "src/bookings/bookings.integration.test.ts",
  "src/rides/rides.integration.test.ts",
  "src/rides/reviews.integration.test.ts",
];

const failures = [];

for (const relativeFile of [...infraCriticalTests, ...authCriticalTests]) {
  const absoluteFile = path.resolve(relativeFile);

  if (!fs.existsSync(absoluteFile)) {
    failures.push(`missing required integration test file: ${relativeFile}`);
  }
}

for (const relativeFile of authCriticalTests) {
  const absoluteFile = path.resolve(relativeFile);
  if (!fs.existsSync(absoluteFile)) {
    continue;
  }

  const source = fs.readFileSync(absoluteFile, "utf8");
  if (!source.includes("describeAuthIntegration(")) {
    failures.push(
      `${relativeFile}: auth-backed integration flows must be gated with describeAuthIntegration(...)`,
    );
  }
}

if (failures.length > 0) {
  throw new Error(
    [
      "[integration gate] Critical integration flow coverage is incomplete.",
      ...failures.map((failure) => `- ${failure}`),
    ].join("\n"),
  );
}

console.log(
  `[integration gate] Verified ${infraCriticalTests.length} infra-backed and ${authCriticalTests.length} auth-backed critical integration test files.`,
);
