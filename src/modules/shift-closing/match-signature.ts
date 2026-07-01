export type EmployeeCandidate = { id: string; name: string };

/** 將 OCR 結果與員工姓名比對 */
export function matchSignatureToEmployee(
  recognizedText: string,
  employees: EmployeeCandidate[],
): { employee: EmployeeCandidate | null; score: number } {
  const raw = recognizedText.replace(/\s/g, "").trim();
  if (!raw || employees.length === 0) return { employee: null, score: 0 };

  let best: EmployeeCandidate | null = null;
  let bestScore = 0;

  for (const emp of employees) {
    const name = emp.name.trim();
    if (!name) continue;

    let score = 0;
    if (raw === name) score = 100;
    else if (name.includes(raw) || raw.includes(name)) score = 85;
    else {
      const overlap = [...raw].filter((c) => name.includes(c)).length;
      score = (overlap / Math.max(raw.length, name.length)) * 70;
    }

    if (score > bestScore) {
      bestScore = score;
      best = emp;
    }
  }

  if (bestScore < 40) return { employee: null, score: bestScore };
  return { employee: best, score: bestScore };
}

/** 回傳 OCR 可能對應的員工（最多 3 位） */
export function rankEmployeesBySignature(
  recognizedText: string,
  employees: EmployeeCandidate[],
  limit = 3,
): { employee: EmployeeCandidate; score: number }[] {
  const raw = recognizedText.replace(/\s/g, "").trim();
  if (!raw) return [];

  return employees
    .map((emp) => {
      const name = emp.name.trim();
      let score = 0;
      if (raw === name) score = 100;
      else if (name.includes(raw) || raw.includes(name)) score = 85;
      else {
        const overlap = [...raw].filter((c) => name.includes(c)).length;
        score = (overlap / Math.max(raw.length, name.length)) * 70;
      }
      return { employee: emp, score };
    })
    .filter((r) => r.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 清理 OCR 辨識文字（常見雜訊） */
export function cleanOcrText(text: string) {
  return text
    .replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "")
    .trim();
}
