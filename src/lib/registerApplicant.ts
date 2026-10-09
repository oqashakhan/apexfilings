export interface RegistrationRequest {
  businessType: string;
  formationState: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  formationContext?: {
    entrySource: string;
    formationState: string;
    planId: string;
    residency: 'us' | 'non-us';
    serviceId: string;
  };
}

export interface RegistrationResult {
  dashboardUrl: string;
}

// Replace this function with the registration API call when the backend is built.
// Until then, no personal information or password leaves the browser.
export async function registerApplicant(_request: RegistrationRequest): Promise<RegistrationResult> {
  throw new Error('Account creation is not available yet. Your information was not submitted or saved.');
}
