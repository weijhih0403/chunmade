import { describe, expect, it } from "vitest";
import { cleanOcrText, matchSignatureToEmployee } from "@/modules/shift-closing/match-signature";

describe("matchSignatureToEmployee", () => {
  const employees = [
    { id: "1", name: "王小明" },
    { id: "2", name: "陳老闆" },
    { id: "3", name: "李美玲" },
  ];

  it("matches exact name", () => {
    const r = matchSignatureToEmployee("陳老闆", employees);
    expect(r.employee?.id).toBe("2");
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it("matches partial OCR", () => {
    const r = matchSignatureToEmployee("小明", employees);
    expect(r.employee?.name).toBe("王小明");
  });

  it("cleans OCR noise", () => {
    expect(cleanOcrText(" 陳\n老闆! ")).toBe("陳老闆");
  });
});
