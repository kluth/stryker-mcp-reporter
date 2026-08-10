import { describe, it, expect, vi } from "vitest";
import { CheckMutantCacheUseCase } from "./check-mutant-cache.use-case.js";
import type { DatabaseAdapter } from "../../infrastructure/db/database.adapter.js";
import crypto from "crypto";

describe("CheckMutantCacheUseCase", () => {
  it("should return cached result if it exists", () => {
    const mockDb = {
      getFromMutantCache: vi.fn().mockReturnValue({
        mutant_id: "m1",
        status: "Killed"
      }),
      saveToMutantCache: vi.fn()
    } as unknown as DatabaseAdapter;

    const useCase = new CheckMutantCacheUseCase(mockDb);
    const result = useCase.execute("const a = 1;", "test.js");

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.cached).toBe(true);
      expect(result.value.status).toBe("Killed");
      expect(result.value.mutantId).toBe("m1");
    }
  });

  it("should return not cached if it does not exist", () => {
    const mockDb = {
      getFromMutantCache: vi.fn().mockReturnValue(null),
      saveToMutantCache: vi.fn()
    } as unknown as DatabaseAdapter;

    const useCase = new CheckMutantCacheUseCase(mockDb);
    const result = useCase.execute("const a = 1;", "test.js");

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.cached).toBe(false);
    }
  });

  it("should save to cache", () => {
    const mockDb = {
      getFromMutantCache: vi.fn(),
      saveToMutantCache: vi.fn()
    } as unknown as DatabaseAdapter;

    const useCase = new CheckMutantCacheUseCase(mockDb);
    useCase.save("const a = 1;", "test.js", "m2", "Survived");

    expect(mockDb.saveToMutantCache).toHaveBeenCalled();
  });
});
