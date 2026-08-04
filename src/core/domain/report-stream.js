import { BehaviorSubject, Observable } from "rxjs";
import { ok, err } from "./result.js";
export class ReportStream {
    subject = new BehaviorSubject(null);
    subscribe(observer) {
        this.subject.subscribe((report) => {
            if (report !== null) {
                observer(report);
            }
        });
    }
    publish(report) {
        if (!report) {
            return err(new Error("Cannot publish a null or undefined report."));
        }
        this.subject.next(report);
        return ok(undefined);
    }
    current() {
        return this.subject.getValue();
    }
    asObservable() {
        return this.subject.asObservable();
    }
}
