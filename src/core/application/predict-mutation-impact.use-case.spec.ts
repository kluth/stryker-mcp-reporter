// src/core/application/predict-mutation-impact.use-case.spec.ts
import { describe, it, expect } from "vitest";
import { PredictMutationImpactUseCase } from "./predict-mutation-impact.use-case.js";

describe("PredictMutationImpactUseCase", () => {
  const useCase = new PredictMutationImpactUseCase();

  it("should categorize core domain, use-case, and adapter files as HIGH risk", () => {
    const files = [
      "src/core/domain/mutation-report.ts",
      "src/core/application/run-mutation-tests.use-case.ts",
      "src/infrastructure/db/database.adapter.ts"
    ];
    const results = useCase.execute(files);
    expect(results).toHaveLength(3);
    expect(results[0].riskLevel).toBe("HIGH");
    expect(results[1].riskLevel).toBe("HIGH");
    expect(results[2].riskLevel).toBe("HIGH");
  });

  it("should categorize helper, config, and util files as MEDIUM risk", () => {
    const files = ["src/utils/helper.ts", "jest.config.js", "src/util/string.ts"];
    const results = useCase.execute(files);
    expect(results).toHaveLength(3);
    expect(results[0].riskLevel).toBe("MEDIUM");
    expect(results[1].riskLevel).toBe("MEDIUM");
    expect(results[2].riskLevel).toBe("MEDIUM");
  });

  it("should categorize generic files as LOW risk", () => {
    const files = ["src/constants.ts"];
    const results = useCase.execute(files);
    expect(results).toHaveLength(1);
    expect(results[0].riskLevel).toBe("LOW");
  });
});
