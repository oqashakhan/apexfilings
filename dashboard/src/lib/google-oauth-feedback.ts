export const googleOAuthFeedback = {
  account_exists: {
    title: "Account Already Exists",
    message: "An account with this email already exists. Please sign in using your password, then connect Google from your account settings.",
  },
  cancelled: {
    title: "Google Sign-In Cancelled",
    message: "Google sign-in was cancelled. You can try again or sign in with your password.",
  },
  expired: {
    title: "Google Sign-In Expired",
    message: "Your Google sign-in session expired. Please try again.",
  },
  unverified: {
    title: "Email Verification Required",
    message: "Google did not provide a verified email address. Please use a verified Google account or sign in with your password.",
  },
  linked_elsewhere: {
    title: "Google Account Already Connected",
    message: "This Google account is connected to another Apex Filings account. Choose a different Google account.",
  },
  email_mismatch: {
    title: "Email Addresses Do Not Match",
    message: "To connect Google, choose a Google account with the same email address as your Apex Filings account.",
  },
  session_expired: {
    title: "Session Expired",
    message: "Please sign in again before connecting your Google account.",
  },
  unavailable: {
    title: "Google Sign-In Unavailable",
    message: "Google sign-in is temporarily unavailable. Please sign in with your password or try again later.",
  },
  failed: {
    title: "Google Sign-In Failed",
    message: "We could not complete Google sign-in. Please try again or sign in with your password.",
  },
} as const;

export type GoogleOAuthErrorCode = keyof typeof googleOAuthFeedback;

export function getGoogleOAuthFeedback(value: string | null | undefined) {
  return value && Object.hasOwn(googleOAuthFeedback, value)
    ? googleOAuthFeedback[value as GoogleOAuthErrorCode]
    : null;
}

export function googleOAuthErrorCode(status: number, message: string): GoogleOAuthErrorCode {
  if (status === 409 && message.startsWith("An account already uses this email.")) return "account_exists";
  if (status === 409 && message === "This Google account is linked elsewhere") return "linked_elsewhere";
  if (status === 409 && message === "Google email must match your account email to link it") return "email_mismatch";
  if (status === 401 || message === "Account linking session expired") return "session_expired";
  if (status === 503) return "unavailable";
  if (message === "A verified Google email is required") return "unverified";
  if (message === "Google sign-in was cancelled") return "cancelled";
  if (status === 400 && (message.includes("expired") || message.includes("already used"))) return "expired";
  return "failed";
}
