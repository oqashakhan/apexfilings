import { test } from "node:test";
import assert from "node:assert/strict";
import { getGoogleOAuthFeedback, googleOAuthErrorCode } from "../src/lib/google-oauth-feedback.ts";

test("existing password account maps to the approved recovery message", () => {
  const code = googleOAuthErrorCode(409, "An account already uses this email. Sign in with your password and link Google from account settings.");
  assert.equal(code, "account_exists");
  assert.deepEqual(getGoogleOAuthFeedback(code), {
    title: "Account Already Exists",
    message: "An account with this email already exists. Please sign in using your password, then connect Google from your account settings.",
  });
});

test("OAuth failures map to fixed public messages without reflecting provider details", () => {
  assert.equal(googleOAuthErrorCode(400, "Google sign-in was cancelled"), "cancelled");
  assert.equal(googleOAuthErrorCode(400, "Google sign-in expired"), "expired");
  assert.equal(googleOAuthErrorCode(409, "This Google account is linked elsewhere"), "linked_elsewhere");
  assert.equal(googleOAuthErrorCode(409, "Google email must match your account email to link it"), "email_mismatch");
  assert.equal(googleOAuthErrorCode(503, "Google sign-in is not configured"), "unavailable");
  assert.equal(googleOAuthErrorCode(500, "secret provider response"), "failed");
  assert.equal(getGoogleOAuthFeedback("secret provider response"), null);
});
