const requiredIntegrationEnv = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

process.env.RUN_LIVE_INTEGRATION_TESTS ??= "true";
process.env.RUN_AUTH_INTEGRATION_TESTS ??= "false";

const hasDatabaseUrl =
  typeof process.env.TEST_DATABASE_URL === "string" ||
  typeof process.env.DATABASE_URL === "string";

const missingEnv = requiredIntegrationEnv.filter(
  (name) => !process.env[name] || process.env[name]?.trim().length === 0,
);

if (!hasDatabaseUrl || missingEnv.length > 0) {
  const missing = [
    ...(hasDatabaseUrl ? [] : ["DATABASE_URL or TEST_DATABASE_URL"]),
    ...missingEnv,
  ];

  throw new Error(
    [
      "[integration-test setup] Missing required integration environment.",
      `Missing: ${missing.join(", ")}`,
      "Required services: a reachable PostgreSQL database.",
      "Auth-backed integration tests also require a real Supabase project with Auth enabled and RUN_AUTH_INTEGRATION_TESTS=true.",
      "Expected run mode: npm run test:integration",
    ].join(" "),
  );
}
