/**
 * Rules for choosing a new password (used by the Change password screen).
 *
 * Deliberately simple and explainable: long enough, not obviously guessable, not built from
 * the account's own email, different from the current one, and typed twice the same. No
 * "must contain a symbol" rules, which push people to predictable patterns; length matters more.
 */
export const MIN_PASSWORD_LENGTH = 10;

const COMMON = [
    "password", "passw0rd", "p@ssword", "qwerty", "qwertyuiop", "asdfghjkl", "letmein", "welcome", "iloveyou",
    "admin", "administrator", "changeme", "football", "monkey", "dragon", "abc123", "eventflow", "maincharacter",
    "nigeria", "lagos", "1234567890", "0123456789", "0987654321",
];

const stripped = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** 12345678, abcdefgh, 11111111, 98765432 ... */
function isPatternOnly(s: string): boolean {
    const t = stripped(s);
    if (t.length < 6) return false;
    if (new Set(t).size === 1) return true;
    let up = true, down = true;
    for (let i = 1; i < t.length; i++) {
        if (t.charCodeAt(i) !== t.charCodeAt(i - 1) + 1) up = false;
        if (t.charCodeAt(i) !== t.charCodeAt(i - 1) - 1) down = false;
    }
    return up || down;
}

function isTooCommon(s: string): boolean {
    const t = stripped(s);
    if (isPatternOnly(s)) return true;
    // a common word, optionally with a few digits/characters stuck on the end ("password2026!")
    return COMMON.some((w) => t.startsWith(w) && t.length <= w.length + 5);
}

export interface PasswordCheck {
    ok: boolean;
    /** Plain-language problems, most important first. Empty when ok. */
    problems: string[];
}

export function checkNewPassword(input: { current: string; next: string; confirm: string; email?: string | null }): PasswordCheck {
    const { current, next, confirm } = input;
    const problems: string[] = [];
    if (next.length > 0) {
        if (next.length < MIN_PASSWORD_LENGTH) problems.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
        else if (isTooCommon(next)) problems.push("That password is too easy to guess. Try a few unrelated words.");
        const name = stripped((input.email ?? "").split("@")[0]);
        if (name.length >= 3 && stripped(next).includes(name)) problems.push("Don't build your password from your email name.");
        if (current && next === current) problems.push("The new password must be different from the current one.");
    }
    if (confirm.length > 0 && confirm !== next) problems.push("The two new passwords don't match.");
    // "ok" also needs everything filled in
    const complete = current.length > 0 && next.length > 0 && confirm.length > 0;
    return { ok: complete && problems.length === 0, problems };
}

export type Strength = { score: 0 | 1 | 2 | 3; label: "Too short" | "Fair" | "Good" | "Strong" };

/** Cosmetic meter under the new-password box. Length counts most. */
export function passwordStrength(next: string): Strength {
    if (next.length < MIN_PASSWORD_LENGTH || isTooCommon(next)) return { score: 0, label: "Too short" };
    let points = 1;
    if (next.length >= 14) points++;
    if (next.length >= 18) points++;
    if (/[a-z]/.test(next) && /[A-Z]/.test(next)) points++;
    if (/\d/.test(next) && /[^\dA-Za-z]/.test(next)) points++;
    const score = Math.min(3, Math.max(1, points - 1)) as 1 | 2 | 3;
    return { score, label: score === 1 ? "Fair" : score === 2 ? "Good" : "Strong" };
}
