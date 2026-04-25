import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const PLATFORM_FEE_CONFIG_KEY = "platformFeePercent";
export const DEFAULT_PLATFORM_FEE_PERCENT = "10";

type ConfigClient = Pick<typeof prisma, "config">;

function normalizePercentageValue(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }

  return parsed.toString();
}

export async function ensureConfigValue(
  key: string,
  defaultValue: string,
  client: ConfigClient = prisma,
) {
  return client.config.upsert({
    where: { key },
    update: {},
    create: { key, value: defaultValue },
  });
}

export async function getConfigMap(client: ConfigClient = prisma) {
  await ensureConfigValue(
    PLATFORM_FEE_CONFIG_KEY,
    DEFAULT_PLATFORM_FEE_PERCENT,
    client,
  );

  const configs = await client.config.findMany({
    orderBy: { key: "asc" },
  });

  return Object.fromEntries(configs.map((config) => [config.key, config.value]));
}

export async function upsertConfigValue(
  key: string,
  value: string,
  client: ConfigClient = prisma,
) {
  return client.config.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getPlatformFeePercent(client: ConfigClient = prisma) {
  const config = await ensureConfigValue(
    PLATFORM_FEE_CONFIG_KEY,
    DEFAULT_PLATFORM_FEE_PERCENT,
    client,
  );

  return new Prisma.Decimal(normalizePercentageValue(config.value));
}

export async function getPlatformFeeRate(client: ConfigClient = prisma) {
  const percent = await getPlatformFeePercent(client);
  return percent.div(new Prisma.Decimal(100));
}
