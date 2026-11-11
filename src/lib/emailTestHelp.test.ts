import { test } from "node:test";
import assert from "node:assert/strict";
import { explainEmailError } from "./emailTestHelp.ts";

test("an unverified domain says what to check", () => {
    const m = explainEmailError({ name: "validation_error", message: "The jolextom.com domain is not verified. Please, add and verify your domain on https://resend.com/domains" });
    assert.match(m, /Resend > Domains/); assert.match(m, /same Resend account/);
});
test("the 'testing emails only to yourself' error means the domain isn't verified for this account", () => {
    assert.match(explainEmailError({ message: "You can only send testing emails to your own email address (a@b.com)" }), /SAME account/);
});
test("a restricted key says to make a sending key and update Vercel", () => {
    assert.match(explainEmailError({ name: "restricted_api_key", message: "This API key is restricted to only send emails" }), /Sending access.*RESEND_API_KEY/s);
});
test("a bad or missing key points at RESEND_API_KEY", () => {
    for (const msg of ["API key is invalid", "Missing API key in the authorization header", "Unauthorized"]) assert.match(explainEmailError({ message: msg }), /RESEND_API_KEY/, msg);
});
test("anything else is passed on in plain words, and an empty error still says where to look", () => {
    assert.equal(explainEmailError({ message: "Something odd" }), "Resend said: Something odd");
    assert.match(explainEmailError(null), /Resend dashboard/);
    assert.match(explainEmailError("raw string error"), /raw string error/);
});
