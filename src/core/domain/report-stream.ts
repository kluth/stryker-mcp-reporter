import { BehaviorSubject, Observable } from "rxjs";
import { ok, err } from "./result.js";
import type { Result } from "./result.js";
import type { MutationReport } from "./mutation-report.js";

export class ReportStream {
  private readonly subject = new BehaviorSubject<MutationReport | null>(null);

  public subscribe(observer: (report: MutationReport) => void): void {
    this.subject.subscribe((report) => {
      if (report !== null) {
        observer(report);
      }
    });
  }

  public publish(report: MutationReport): Result<void, Error> {
    if (!report) {
      return err(new Error("Cannot publish a null or undefined report."));
    }

    this.subject.next(report);
    return ok(undefined);
  }

  public current(): MutationReport | null {
    return this.subject.getValue();
  }

  public asObservable(): Observable<MutationReport | null> {
    return this.subject.asObservable();
  }
}
