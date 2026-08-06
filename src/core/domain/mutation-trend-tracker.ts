// src/core/domain/mutation-trend-tracker.ts
export interface HistoricalRun {
  timestamp: string;
  mutationScore: number;
  totalMutants: number;
  killedMutants: number;
  survivedMutants: number;
}

export class MutationTrendTracker {
  private history: HistoricalRun[] = [];

  constructor(initialHistory: HistoricalRun[] = []) {
    this.history = [...initialHistory];
  }

  public recordRun(run: HistoricalRun): void {
    this.history.push(run);
  }

  public getHistory(): HistoricalRun[] {
    return [...this.history];
  }

  public getTrendSummary(): {
    scoreDelta: number;
    isImproving: boolean;
    latestScore: number;
  } {
    if (this.history.length === 0) {
      return { scoreDelta: 0, isImproving: true, latestScore: 0 };
    }

    const latest = this.history[this.history.length - 1];
    if (this.history.length === 1) {
      return {
        scoreDelta: 0,
        isImproving: true,
        latestScore: latest.mutationScore,
      };
    }

    const previous = this.history[this.history.length - 2];
    const scoreDelta = Number(
      (latest.mutationScore - previous.mutationScore).toFixed(2),
    );
    const isImproving = scoreDelta >= 0;

    return {
      scoreDelta,
      isImproving,
      latestScore: latest.mutationScore,
    };
  }
}
