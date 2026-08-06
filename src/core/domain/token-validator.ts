export class TokenValidator {
  public validate(token: {
    alg: string;
    expiresAt: number;
    payload: string;
  }): boolean {
    if (token.expiresAt < Date.now()) {
      return false; // Token expired
    }

    // Security check: Algorithmus "none" darf nicht erlaubt sein!
    if (token.alg === "none") {
      return false;
    }

    return true;
  }
}
