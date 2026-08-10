// src/core/domain/events.ts

export interface DomainEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly payload: unknown;
}

export class MutantSurvivedEvent implements DomainEvent {
  public readonly type = "MutantSurvived";
  public readonly timestamp = new Date();
  
  constructor(public readonly payload: { mutantId: string; filePath: string }) {}
}

export class ReportPublishedEvent implements DomainEvent {
  public readonly type = "ReportPublished";
  public readonly timestamp = new Date();
  
  constructor(public readonly payload: { mutationScore: number; totalMutants: number }) {}
}

export class AdrGeneratedEvent implements DomainEvent {
  public readonly type = "AdrGenerated";
  public readonly timestamp = new Date();
  
  constructor(public readonly payload: { filePath: string; title: string }) {}
}
