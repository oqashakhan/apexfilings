import { US_STATES } from '../data/usStates';

const configuredOrigin = import.meta.env.VITE_DASHBOARD_URL?.trim();
function resolveDashboardOrigin() {
  try {
    if (!configuredOrigin) return 'https://app.apexfilings.com';
    const url = new URL(configuredOrigin);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) return 'https://app.apexfilings.com';
    return url.origin;
  } catch { return 'https://app.apexfilings.com'; }
}
const dashboardOrigin = resolveDashboardOrigin();

export function dashboardUrl(path: '/login' | '/register'): string {
  return `${dashboardOrigin}${path}`;
}

export function applicationDestination(options: { state?: string | null; plan?: string | null }): string {
  const params = new URLSearchParams();
  const requestedState = options.state?.toLowerCase().replace(/\s+/g, '-');
  const state = US_STATES.find((item) => item.availableForFormation &&
    (item.code.toLowerCase() === requestedState || item.slug === requestedState || item.name.toLowerCase().replace(/\s+/g, '-') === requestedState));
  if (state) params.set('state', state.name);
  const plan = options.plan === 'advanced' ? 'premium' : options.plan;
  if (plan === 'basic' || plan === 'premium') params.set('plan', plan);
  const query = params.toString();
  return `/client/applications/new${query ? `?${query}` : ''}`;
}

export function dashboardApplicationUrl(options: { state?: string | null; plan?: string | null }): string {
  return `${dashboardUrl('/login')}?next=${encodeURIComponent(applicationDestination(options))}`;
}

export function dashboardOnboardingUrl(action: 'register' | 'prepare'): string {
  return `${dashboardOrigin}/api/v1/onboarding/${action}`;
}

export function dashboardNewApplicationUrl(): string {
  return `${dashboardOrigin}/client/applications/new`;
}

export function dashboardOnboardingApplicationUrl(): string {
  return `${dashboardNewApplicationUrl()}?handoff=1`;
}

export function dashboardOnboardingVerifyUrl(): string {
  return `${dashboardOrigin}/verify-email?next=${encodeURIComponent('/client/applications/new?handoff=1')}`;
}

export function dashboardOnboardingLoginUrl(): string {
  return `${dashboardUrl('/login')}?next=${encodeURIComponent('/client/applications/new?handoff=1')}`;
}
