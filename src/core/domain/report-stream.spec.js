import { describe, it, expect, vi } from "vitest";
import { ReportStream } from "./report-stream.js";
describe("ReportStream", () => {
    it("sollte initial keinen Report enthalten", () => {
        const stream = new ReportStream();
        expect(stream.current()).toBeNull();
    });
    it("sollte Subscriber reaktiv benachrichtigen, wenn ein valider Report publiziert wird", () => {
        const stream = new ReportStream();
        const subscriber = vi.fn();
        stream.subscribe(subscriber);
        const dummyReport = { files: {} };
        const result = stream.publish(dummyReport);
        expect(result.isOk).toBeTruthy();
        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenCalledWith(dummyReport);
        expect(stream.current()).toBe(dummyReport);
    });
    it("sollte einen expliziten Error zurückgeben, wenn ein leerer Report publiziert wird", () => {
        const stream = new ReportStream();
        const subscriber = vi.fn();
        stream.subscribe(subscriber);
        const result = stream.publish(null);
        expect(result.isOk).toBeFalsy();
        expect(result.error?.message).toBe("Cannot publish a null or undefined report.");
        expect(subscriber).not.toHaveBeenCalled();
        expect(stream.current()).toBeNull();
    });
    it("sollte via asObservable den Stream für externe Consumer (z.B. Outbound-Adapter) bereitstellen", () => {
        const stream = new ReportStream();
        const observer = vi.fn();
        // Act: Externe Subscription auf das reine Observable
        const subscription = stream.asObservable().subscribe(observer);
        // Assert 1: BehaviorSubject emittiert sofort den initialen Zustand
        expect(observer).toHaveBeenNthCalledWith(1, null);
        // Act 2: Ein valider Report wird in das System gepusht
        const dummyReport = { files: {} };
        const result = stream.publish(dummyReport);
        // Assert 2: Das Observable emittiert den neuen Zustand reaktiv an den Subscriber
        expect(result.isOk).toBe(true);
        expect(observer).toHaveBeenNthCalledWith(2, dummyReport);
        expect(observer).toHaveBeenCalledTimes(2);
        // Clean-up (guter Stil bei asynchronen Tests, auch wenn Vitest oft selbst aufräumt)
        subscription.unsubscribe();
    });
});
