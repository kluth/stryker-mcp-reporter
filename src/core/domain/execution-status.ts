// src/core/domain/execution-status.ts
import { BehaviorSubject, Observable } from "rxjs";

export type ExecutionStateKind = "idle" | "running" | "completed" | "failed";

export interface ExecutionProgress {
  percentage?: number;
  message?: string;
}

export interface ExecutionState {
  state: ExecutionStateKind;
  progress?: ExecutionProgress;
  lastRunTime?: string;
  error: string | null;
}

export class ExecutionStatusStream {
  private readonly subject: BehaviorSubject<ExecutionState>;

  constructor() {
    this.subject = new BehaviorSubject<ExecutionState>({
      state: "idle",
      error: null,
    });
  }

  public current(): ExecutionState {
    return this.subject.getValue();
  }

  public asObservable(): Observable<ExecutionState> {
    return this.subject.asObservable();
  }

  public setIdle(): void {
    this.subject.next({
      state: "idle",
      error: null,
      lastRunTime: this.current().lastRunTime,
    });
  }

  public setRunning(message?: string, percentage?: number): void {
    this.subject.next({
      state: "running",
      progress: { message, percentage },
      error: null,
      lastRunTime: this.current().lastRunTime,
    });
  }

  public setCompleted(message?: string): void {
    this.subject.next({
      state: "completed",
      progress: { percentage: 100, message },
      lastRunTime: new Date().toISOString(),
      error: null,
    });
  }

  public setFailed(errorMessage: string): void {
    this.subject.next({
      state: "failed",
      error: errorMessage,
      lastRunTime: new Date().toISOString(),
    });
  }
}
