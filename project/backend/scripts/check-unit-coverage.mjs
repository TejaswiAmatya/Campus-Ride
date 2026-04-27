import fs from "node:fs";
import path from "node:path";

const summaryPath = path.resolve("coverage", "coverage-summary.json");

if (!fs.existsSync(summaryPath)) {
  throw new Error(
    `[unit coverage gate] Missing ${summaryPath}. Run the unit suite with coverage before checking thresholds.`,
  );
}

const coverageSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const moduleThresholds = [
  {
    file: "src/rides/matching.ts",
    thresholds: { statements: 90, branches: 80, functions: 100, lines: 90 },
  },
  {
    file: "src/rides/recurrence.ts",
    thresholds: { statements: 95, branches: 90, functions: 100, lines: 95 },
  },
  {
    file: "src/rides/serialize.ts",
    thresholds: { statements: 95, branches: 90, functions: 100, lines: 95 },
  },
  {
    file: "src/rides/location.ts",
    thresholds: { statements: 80, branches: 60, functions: 80, lines: 80 },
  },
  {
    file: "src/payments/service.ts",
    thresholds: { statements: 100, branches: 90, functions: 100, lines: 100 },
  },
  {
    file: "src/users/schemas.ts",
    thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
  {
    file: "src/bookings/schemas.ts",
    thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
  {
    file: "src/admin/schemas.ts",
    thresholds: { statements: 95, branches: 90, functions: 100, lines: 95 },
  },
];

function getSummaryRecord(file) {
  const normalized = file.replaceAll("\\", "/");
  const entry = Object.entries(coverageSummary).find(([key]) =>
    key.replaceAll("\\", "/").endsWith(normalized),
  );

  return entry?.[1] ?? null;
}

const failures = [];

for (const moduleGate of moduleThresholds) {
  const summaryRecord = getSummaryRecord(moduleGate.file);

  if (!summaryRecord) {
    failures.push(
      `${moduleGate.file}: missing from coverage summary (check coverage include/reporter settings)`,
    );
    continue;
  }

  for (const [metric, minimum] of Object.entries(moduleGate.thresholds)) {
    const actual = summaryRecord[metric]?.pct;

    if (typeof actual !== "number") {
      failures.push(`${moduleGate.file}: missing metric ${metric}`);
      continue;
    }

    if (actual < minimum) {
      failures.push(
        `${moduleGate.file}: ${metric} ${actual.toFixed(2)}% < ${minimum}%`,
      );
    }
  }
}

if (failures.length > 0) {
  throw new Error(
    [
      "[unit coverage gate] Business-logic coverage thresholds failed.",
      ...failures.map((failure) => `- ${failure}`),
    ].join("\n"),
  );
}

console.log("[unit coverage gate] All targeted business-logic thresholds passed.");
