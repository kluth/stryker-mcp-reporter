// src/core/domain/mutation-trend-tracker.spec.ts
import { describe, it, expect } from "vitest";
import { MutationTrendTracker } from "./mutation-trend-tracker.js";

describe("MutationTrendTracker", () => {
  it("should calculate score delta and trend direction accurately", () => {
    const tracker = new MutationTrendTracker([
      {
        timestamp: "2026-08-01T10:00:00Z",
        mutationScore: 85.0,
        totalMutants: 100,
        killedMutants: 85,
        survivedMutants: 15,
      },
    ]);

    tracker.recordRun({
      timestamp: "2026-08-05T10:00:00Z",
      mutationScore: 92.5,
      totalMutants: 100,
      killedMutants: 92,
      survivedMutants: 8,
    });

    const summary = tracker.getTrendSummary();
    expect(summary.latestScore).toBe(92.5);
    expect(summary.scoreDelta).toBe(7.5);
    expect(summary.isImproving).toBe(true);
  });

  it("should handle single run gracefully", () => {
    const tracker = new MutationTrendTracker([
      {
        timestamp: "2026-08-05T10:00:00Z",
        mutationScore: 100,
        totalMutants: 50,
        killedMutants: 50,
        survivedMutants: 0,
      },
    ]);

    const summary = tracker.getTrendSummary();
    expect(summary.latestScore).toBe(100);
    expect(summary.scoreDelta).toBe(0);
    expect(summary.isImproving).toBe(true);
  });
});
