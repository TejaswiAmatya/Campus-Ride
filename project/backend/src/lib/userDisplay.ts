export const DEACTIVATED_ACCOUNT_STATUS = "DEACTIVATED";
export const DELETED_ACCOUNT_NAME = "Deleted account";

type DisplayUser = {
  id: string;
  name: string;
  accountStatus?: string | null;
  avatarPath?: string | null;
};

export function isDeactivatedAccountStatus(
  accountStatus: string | null | undefined,
): boolean {
  return accountStatus === DEACTIVATED_ACCOUNT_STATUS;
}

export function getDisplayName(user: DisplayUser): string {
  return isDeactivatedAccountStatus(user.accountStatus)
    ? DELETED_ACCOUNT_NAME
    : user.name;
}

export function getDisplayAvatarPath(user: DisplayUser): string | null {
  return isDeactivatedAccountStatus(user.accountStatus)
    ? null
    : user.avatarPath ?? null;
}

export function toAvatarUrlSummary(user: DisplayUser) {
  return {
    id: user.id,
    name: getDisplayName(user),
    avatarUrl: getDisplayAvatarPath(user),
  };
}

export function toAvatarPathSummary(user: DisplayUser) {
  return {
    id: user.id,
    name: getDisplayName(user),
    avatarPath: getDisplayAvatarPath(user),
  };
}

export function toNameSummary(user: DisplayUser) {
  return {
    id: user.id,
    name: getDisplayName(user),
  };
}
