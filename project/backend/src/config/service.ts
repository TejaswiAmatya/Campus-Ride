import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const PLATFORM_FEE_CONFIG_KEY = "platformFeePercent";
export const DEFAULT_PLATFORM_FEE_PERCENT = "10";
export const ALLOWED_EMAIL_DOMAINS_CONFIG_KEY = "allowedEmailDomains";
export const MAX_SEATS_PER_RIDE_CONFIG_KEY = "maxSeatsPerRide";

export const ALLOWED_CONFIG_KEYS = [
  PLATFORM_FEE_CONFIG_KEY,
  ALLOWED_EMAIL_DOMAINS_CONFIG_KEY,
  MAX_SEATS_PER_RIDE_CONFIG_KEY,
] as const;

export const PUBLIC_CONFIG_KEYS = [PLATFORM_FEE_CONFIG_KEY] as const;

type ConfigClient = Pick<typeof prisma, "config">;

function normalizePercentageValue(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
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

export async function getAdminConfigMap(client: ConfigClient = prisma) {
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

export async function getPublicConfigMap(client: ConfigClient = prisma) {
  const config = await getAdminConfigMap(client);

  return Object.fromEntries(
    PUBLIC_CONFIG_KEYS.map((key) => [key, config[key]]).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
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
