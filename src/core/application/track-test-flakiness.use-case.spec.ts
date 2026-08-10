import { describe, it, expect, vi } from 'vitest';
import { TrackTestFlakinessUseCase } from './track-test-flakiness.use-case';
import type { DatabaseAdapter } from '../../infrastructure/db/database.adapter.js';

describe('TrackTestFlakinessUseCase', () => {
    it('should execute track-test-flakiness successfully', () => {
        const mockDb = {
            getRuns: vi.fn().mockReturnValue([]),
            getMutantsForRun: vi.fn().mockReturnValue([]),
            saveFlakyMutant: vi.fn(),
        } as unknown as DatabaseAdapter;
        
        const useCase = new TrackTestFlakinessUseCase(mockDb);
        const result = useCase.execute([]);
        expect(result).toEqual([]);
    });
});