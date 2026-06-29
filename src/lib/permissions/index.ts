import "server-only";
import { RoleName } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { resolvePermissions, type PermissionKey } from "./catalog";

export type Actor = {
  id: string;
  name: string;
  companyId: string | null;
  roles: RoleName[];
  storeIds: string[];
  permissions: Set<PermissionKey>;
};

/** 取得目前登入者（未登入回傳 null） */
export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const roles = session.user.roles ?? [];
  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? "使用者",
    companyId: session.user.companyId ?? null,
    roles,
    storeIds: session.user.storeIds ?? [],
    permissions: resolvePermissions(roles),
  };
}

/** 要求已登入，否則拋出 401 */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  return actor;
}

export function actorHasPermission(actor: Actor, key: PermissionKey): boolean {
  return actor.permissions.has(key);
}

export function actorHasAnyRole(actor: Actor, roles: RoleName[]): boolean {
  return actor.roles.some((r) => roles.includes(r));
}

/** 要求具備某權限，否則拋出 403 */
export async function requirePermission(key: PermissionKey): Promise<Actor> {
  const actor = await requireActor();
  if (!actorHasPermission(actor, key)) {
    throw new ForbiddenError(`權限不足：需要 ${key}`);
  }
  return actor;
}

/** 要求至少具備其中一個權限 */
export async function requireAnyPermission(keys: PermissionKey[]): Promise<Actor> {
  const actor = await requireActor();
  if (!keys.some((k) => actor.permissions.has(k))) {
    throw new ForbiddenError("權限不足");
  }
  return actor;
}

const STORE_UNRESTRICTED_ROLES: RoleName[] = ["OWNER", "ADMIN", "ACCOUNTANT"];

/** 檢查使用者是否可存取指定門市；OWNER/ADMIN/ACCOUNTANT 不受門市限制 */
export function canAccessStore(actor: Actor, storeId: string): boolean {
  if (actorHasAnyRole(actor, STORE_UNRESTRICTED_ROLES)) return true;
  if (actor.storeIds.length === 0) return true; // 未限定門市者視為全公司
  return actor.storeIds.includes(storeId);
}

export function assertStoreAccess(actor: Actor, storeId: string): void {
  if (!canAccessStore(actor, storeId)) {
    throw new ForbiddenError("無權存取此門市資料");
  }
}

/** 公司範圍過濾條件（多租戶資料隔離） */
export function companyScope(actor: Actor): { companyId: string } {
  if (!actor.companyId) {
    throw new ForbiddenError("帳號未指派公司");
  }
  return { companyId: actor.companyId };
}

export { resolvePermissions, type PermissionKey };
