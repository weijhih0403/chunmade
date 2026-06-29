import { describe, it, expect } from "vitest";
import { resolvePermissions } from "@/lib/permissions/catalog";

describe("RBAC 權限解析", () => {
  it("OWNER 擁有全部權限", () => {
    const perms = resolvePermissions(["OWNER"]);
    expect(perms.has("system.manage")).toBe(true);
    expect(perms.has("pos.operate")).toBe(true);
    expect(perms.has("report.export")).toBe(true);
  });

  it("CASHIER 可操作 POS 但不可審核採購", () => {
    const perms = resolvePermissions(["CASHIER"]);
    expect(perms.has("pos.operate")).toBe(true);
    expect(perms.has("purchase.approve")).toBe(false);
  });

  it("STAFF 僅有最小權限", () => {
    const perms = resolvePermissions(["STAFF"]);
    expect(perms.has("attendance.clock")).toBe(true);
    expect(perms.has("inventory.adjust")).toBe(false);
  });

  it("多角色取聯集", () => {
    const perms = resolvePermissions(["CASHIER", "WAREHOUSE"]);
    expect(perms.has("pos.operate")).toBe(true);
    expect(perms.has("inventory.transfer")).toBe(true);
  });
});
