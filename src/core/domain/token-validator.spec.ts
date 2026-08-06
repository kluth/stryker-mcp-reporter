import { describe, it, expect } from "vitest";
import { TokenValidator } from "./token-validator";

describe("TokenValidator", () => {
  const validator = new TokenValidator();

  it("should return true for a valid token", () => {
    const validToken = {
      alg: "HS256",
      expiresAt: Date.now() + 10000,
      payload: "admin",
    };
    expect(validator.validate(validToken)).toBe(true);
  });

  it("should return false if the token is expired", () => {
    const expiredToken = {
      alg: "HS256",
      expiresAt: Date.now() - 10000,
      payload: "admin",
    };
    expect(validator.validate(expiredToken)).toBe(false);
  });

  // INTENTIONAL: We omit the test that explicitly verifies `alg === "none"` returns false.
  // This will cause the `token.alg === "none"` mutant (e.g. `token.alg !== "none"`) to survive!
});
