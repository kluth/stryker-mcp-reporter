// src/core/application/predict-mutation-impact.use-case.spec.ts
import { describe, it, expect } from "vitest";
import { PredictMutationImpactUseCase } from "./predict-mutation-impact.use-case.js";

describe("PredictMutationImpactUseCase", () => {
  const useCase = new PredictMutationImpactUseCase();

  it("should categorize core domain and use-case files as HIGH risk", () => {
    const files = ["src/core/domain/mutation-report.ts", "src/core/application/run-mutation-tests.use-case.ts"];
    const results = useCase.execute(files);
    expect(results).toHaveLength(2);
    expect(results[0].riskLevel).toBe("HIGH");
    expect(results[1].riskLevel).toBe("HIGH");
  });

  it("should categorize helper and config files as MEDIUM risk", () => {
    const files = ["src/utils/helper.ts"];
    const results = useCase.execute(files);
    expect(results).toHaveLength(1);
    expect(results[0].riskLevel).toBe("MEDIUM");
  });

  it("should categorize generic files as LOW risk", () => {
    const files = ["src/constants.ts"];
    const results = useCase.execute(files);
    expect(results).toHaveLength(1);
    expect(results[0].riskLevel).toBe("LOW");
  });
});
