import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Every function exported from a file that starts with "use server" is a PUBLIC web endpoint: anyone can call it with any
 * arguments. A user-id or identity-id argument is not proof of who is calling. This test makes adding one a deliberate decision.
 */
const ROOT = path.resolve(import.meta.dirname, "..");
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(ROOT).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts"));
const serverFiles = files.filter((f) => /^\s*['"]use server['"]/.test(fs.readFileSync(f, "utf8").slice(0, 200))).map((f) => path.relative(ROOT, f).replaceAll("\\", "/"));

test("the files that publish endpoints are exactly the reviewed ones", () => {
    assert.deepEqual(
        serverFiles.sort(),
        ["app/[tag]/actions.ts", "app/actions.ts", "app/events/dashboard/actions.ts", "lib/senderDomains.ts"],
        "A new 'use server' file publishes every export as a public endpoint. Add the auth checks, test them like e2e-lockdown, then list it here."
    );
});

test("nothing public hands out secrets: the sender lookups that return a Resend API key are not in a 'use server' file", () => {
    for (const f of serverFiles) {
        const src = fs.readFileSync(path.join(ROOT, f), "utf8");
        assert.ok(!/export\s+async\s+function\s+resolveSender/.test(src), `${f} exports resolveSender*, which returns API keys`);
    }
    assert.ok(fs.existsSync(path.join(ROOT, "lib/senderResolve.ts")));
    assert.ok(!/^\s*['"]use server['"]/.test(fs.readFileSync(path.join(ROOT, "lib/senderResolve.ts"), "utf8")));
});

test("every public sender-domain function takes the caller's login token, and none takes a userId", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/senderDomains.ts"), "utf8");
    const fns = [...src.matchAll(/export async function (\w+)\(([\s\S]*?)\)\s*:/g)];
    assert.ok(fns.length >= 6, `found ${fns.length} exported functions`);
    for (const [, name, params] of fns) {
        assert.match(params, /accessToken/, `${name} must take accessToken`);
        assert.doesNotMatch(params, /\buserId\b/, `${name} must not trust a userId from the caller`);
    }
});
