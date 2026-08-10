import type { DatabaseAdapter } from "../../infrastructure/db/database.adapter.js";

export class TrackTestFlakinessUseCase {
  constructor(private readonly db: DatabaseAdapter) {}

  execute(currentMutants: { id: string; filePath: string; status: string }[]): any[] {
    const flakyMutants: any[] = [];
    const previousRuns = this.db.getRuns();
    
    if (previousRuns.length === 0) {
      return flakyMutants;
    }

    const lastRun = previousRuns[0];
    const previousMutants = this.db.getMutantsForRun(lastRun.id);
    const previousMutantMap = new Map(previousMutants.map(m => [m.id, m]));

    for (const current of currentMutants) {
      const prev = previousMutantMap.get(current.id);
      if (prev && prev.status !== current.status) {
        if ((prev.status === 'Killed' && current.status === 'Survived') ||
            (prev.status === 'Survived' && current.status === 'Killed')) {
          
          const flaky = {
            mutant_id: current.id,
            file_path: current.filePath,
            status: `Flipped from ${prev.status} to ${current.status}`,
          };
          
          flakyMutants.push(flaky);
          
          try {
            this.db.saveFlakyMutant(flaky.mutant_id, flaky.file_path, flaky.status);
          } catch (e) {
            // Ignore if error
          }
        }
      }
    }

    return flakyMutants;
  }
}
