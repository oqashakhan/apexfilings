export type RecurringFeeFrequency = 'annual' | 'biennial' | 'none' | 'mixed' | null;

export interface USStateData {
  code: string;
  name: string;
  slug: string;
  filingFee: number | null;
  recurringFeeAmount: number | null;
  recurringFeeFrequency: RecurringFeeFrequency;
  recurringFeeDescription: string | null;
  processingTimeLabel: string | null;
  notes: string[];
  availableForFormation: boolean;
}

export const STATE_DATA_NOTICE = 'State filing fees and processing times are estimates based on supplied information and may change. Additional fees or reporting requirements may apply.';

export const US_STATES: USStateData[] = [
  {"code": "AL", "name": "Alabama", "slug": "alabama", "filingFee": null, "recurringFeeAmount": null, "recurringFeeFrequency": null, "recurringFeeDescription": null, "processingTimeLabel": null, "notes": ["State entry missing from supplied document; manual review required"], "availableForFormation": true},
  {"code": "AK", "name": "Alaska", "slug": "alaska", "filingFee": 250, "recurringFeeAmount": 100, "recurringFeeFrequency": "biennial", "recurringFeeDescription": "$100 / 2 years", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "AZ", "name": "Arizona", "slug": "arizona", "filingFee": 50, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0", "processingTimeLabel": "14–16 business days", "notes": [], "availableForFormation": true},
  {"code": "AR", "name": "Arkansas", "slug": "arkansas", "filingFee": 45, "recurringFeeAmount": 150, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$150 / year", "processingTimeLabel": "3–7 business days", "notes": [], "availableForFormation": true},
  {"code": "CA", "name": "California", "slug": "california", "filingFee": 70, "recurringFeeAmount": null, "recurringFeeFrequency": "mixed", "recurringFeeDescription": "$800 / year + $20 / 2 yrs", "processingTimeLabel": "2–3 business days", "notes": [], "availableForFormation": true},
  {"code": "CO", "name": "Colorado", "slug": "colorado", "filingFee": 50, "recurringFeeAmount": 25, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$25 / year", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "CT", "name": "Connecticut", "slug": "connecticut", "filingFee": 120, "recurringFeeAmount": 80, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$80 / year", "processingTimeLabel": "2–3 business days", "notes": [], "availableForFormation": true},
  {"code": "DE", "name": "Delaware", "slug": "delaware", "filingFee": 110, "recurringFeeAmount": 300, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$300 / year", "processingTimeLabel": "10 business days", "notes": [], "availableForFormation": true},
  {"code": "DC", "name": "District of Columbia", "slug": "district-of-columbia", "filingFee": null, "recurringFeeAmount": null, "recurringFeeFrequency": null, "recurringFeeDescription": null, "processingTimeLabel": null, "notes": ["Ambiguous source row: District of Columbia (DC)Washington; manual review required"], "availableForFormation": false},
  {"code": "FL", "name": "Florida", "slug": "florida", "filingFee": 125, "recurringFeeAmount": 138.75, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$138.75 / year", "processingTimeLabel": "5 business days", "notes": [], "availableForFormation": true},
  {"code": "GA", "name": "Georgia", "slug": "georgia", "filingFee": 100, "recurringFeeAmount": 50, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$50 / year", "processingTimeLabel": "7–10 business days", "notes": [], "availableForFormation": true},
  {"code": "HI", "name": "Hawaii", "slug": "hawaii", "filingFee": 50, "recurringFeeAmount": 15, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$15 / year", "processingTimeLabel": "10–15 business days", "notes": [], "availableForFormation": true},
  {"code": "ID", "name": "Idaho", "slug": "idaho", "filingFee": 100, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0 (info-report required)", "processingTimeLabel": "5–7 business days", "notes": ["info-report required"], "availableForFormation": true},
  {"code": "IL", "name": "Illinois", "slug": "illinois", "filingFee": 150, "recurringFeeAmount": 75, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$75 / year", "processingTimeLabel": "5–10 business days", "notes": [], "availableForFormation": true},
  {"code": "IN", "name": "Indiana", "slug": "indiana", "filingFee": 95, "recurringFeeAmount": 31, "recurringFeeFrequency": "biennial", "recurringFeeDescription": "$31 / 2 years", "processingTimeLabel": "1 business day", "notes": [], "availableForFormation": true},
  {"code": "IA", "name": "Iowa", "slug": "iowa", "filingFee": 50, "recurringFeeAmount": 30, "recurringFeeFrequency": "biennial", "recurringFeeDescription": "$30 / 2 years", "processingTimeLabel": "1 business day", "notes": [], "availableForFormation": true},
  {"code": "KS", "name": "Kansas", "slug": "kansas", "filingFee": 160, "recurringFeeAmount": 50, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$50 / year", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "KY", "name": "Kentucky", "slug": "kentucky", "filingFee": 40, "recurringFeeAmount": 15, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$15 / year", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "LA", "name": "Louisiana", "slug": "louisiana", "filingFee": 100, "recurringFeeAmount": 35, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$35 / year", "processingTimeLabel": "3–5 business days", "notes": [], "availableForFormation": true},
  {"code": "ME", "name": "Maine", "slug": "maine", "filingFee": 175, "recurringFeeAmount": 85, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$85 / year", "processingTimeLabel": null, "notes": ["No online processing listed"], "availableForFormation": true},
  {"code": "MD", "name": "Maryland", "slug": "maryland", "filingFee": 100, "recurringFeeAmount": 300, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$300 / year", "processingTimeLabel": "~2 weeks", "notes": [], "availableForFormation": true},
  {"code": "MA", "name": "Massachusetts", "slug": "massachusetts", "filingFee": 500, "recurringFeeAmount": 500, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$500 / year", "processingTimeLabel": "1–2 business days", "notes": [], "availableForFormation": true},
  {"code": "MI", "name": "Michigan", "slug": "michigan", "filingFee": 50, "recurringFeeAmount": 25, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$25 / year", "processingTimeLabel": "7–10 business days", "notes": [], "availableForFormation": true},
  {"code": "MN", "name": "Minnesota", "slug": "minnesota", "filingFee": 155, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0 (info-report required)", "processingTimeLabel": "immediately", "notes": ["info-report required"], "availableForFormation": true},
  {"code": "MS", "name": "Mississippi", "slug": "mississippi", "filingFee": 50, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0 (info-report required)", "processingTimeLabel": "1–2 business days", "notes": ["info-report required"], "availableForFormation": true},
  {"code": "MO", "name": "Missouri", "slug": "missouri", "filingFee": 50, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "MT", "name": "Montana", "slug": "montana", "filingFee": 35, "recurringFeeAmount": 20, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$20 / year", "processingTimeLabel": "5–6 business days", "notes": [], "availableForFormation": true},
  {"code": "NE", "name": "Nebraska", "slug": "nebraska", "filingFee": 100, "recurringFeeAmount": 13, "recurringFeeFrequency": "biennial", "recurringFeeDescription": "$13 / 2 years", "processingTimeLabel": "2–3 business days", "notes": [], "availableForFormation": true},
  {"code": "NV", "name": "Nevada", "slug": "nevada", "filingFee": 425, "recurringFeeAmount": 350, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$350 / year", "processingTimeLabel": "1 business day", "notes": [], "availableForFormation": true},
  {"code": "NH", "name": "New Hampshire", "slug": "new-hampshire", "filingFee": 100, "recurringFeeAmount": 100, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$100 / year", "processingTimeLabel": "7–10 business days", "notes": [], "availableForFormation": true},
  {"code": "NJ", "name": "New Jersey", "slug": "new-jersey", "filingFee": 125, "recurringFeeAmount": 75, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$75 / year", "processingTimeLabel": "1 business day", "notes": [], "availableForFormation": true},
  {"code": "NM", "name": "New Mexico", "slug": "new-mexico", "filingFee": 50, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0", "processingTimeLabel": "1–3 business days", "notes": [], "availableForFormation": true},
  {"code": "NY", "name": "New York", "slug": "new-york", "filingFee": 200, "recurringFeeAmount": 9, "recurringFeeFrequency": "biennial", "recurringFeeDescription": "$9 / 2 years", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "NC", "name": "North Carolina", "slug": "north-carolina", "filingFee": 125, "recurringFeeAmount": 200, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$200 / year", "processingTimeLabel": "2–5 business days", "notes": [], "availableForFormation": true},
  {"code": "ND", "name": "North Dakota", "slug": "north-dakota", "filingFee": 135, "recurringFeeAmount": 50, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$50 / year", "processingTimeLabel": "5 business days", "notes": [], "availableForFormation": true},
  {"code": "OH", "name": "Ohio", "slug": "ohio", "filingFee": 99, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "OK", "name": "Oklahoma", "slug": "oklahoma", "filingFee": 100, "recurringFeeAmount": 25, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$25 / year", "processingTimeLabel": "2–3 business days", "notes": [], "availableForFormation": true},
  {"code": "OR", "name": "Oregon", "slug": "oregon", "filingFee": 100, "recurringFeeAmount": 100, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$100 / year", "processingTimeLabel": "2–3 business days", "notes": [], "availableForFormation": true},
  {"code": "PA", "name": "Pennsylvania", "slug": "pennsylvania", "filingFee": 125, "recurringFeeAmount": 7, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$7 / year", "processingTimeLabel": "5–7 business days", "notes": [], "availableForFormation": true},
  {"code": "RI", "name": "Rhode Island", "slug": "rhode-island", "filingFee": 150, "recurringFeeAmount": 50, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$50 / year", "processingTimeLabel": "3–4 business days", "notes": [], "availableForFormation": true},
  {"code": "SC", "name": "South Carolina", "slug": "south-carolina", "filingFee": 110, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "SD", "name": "South Dakota", "slug": "south-dakota", "filingFee": 150, "recurringFeeAmount": 55, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$55 / year", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "TN", "name": "Tennessee", "slug": "tennessee", "filingFee": 300, "recurringFeeAmount": 300, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$300 / year", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "TX", "name": "Texas", "slug": "texas", "filingFee": 308, "recurringFeeAmount": 0, "recurringFeeFrequency": "none", "recurringFeeDescription": "$0 (PIR required)", "processingTimeLabel": "13–15 business days", "notes": ["PIR required"], "availableForFormation": true},
  {"code": "UT", "name": "Utah", "slug": "utah", "filingFee": 59, "recurringFeeAmount": 18, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$18 / year", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "VT", "name": "Vermont", "slug": "vermont", "filingFee": 155, "recurringFeeAmount": 45, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$45 / year", "processingTimeLabel": "1 business day", "notes": [], "availableForFormation": true},
  {"code": "VA", "name": "Virginia", "slug": "virginia", "filingFee": 100, "recurringFeeAmount": 50, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$50 / year", "processingTimeLabel": "2–5 business days", "notes": [], "availableForFormation": true},
  {"code": "WA", "name": "Washington", "slug": "washington", "filingFee": 200, "recurringFeeAmount": 60, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$60 / year", "processingTimeLabel": "5 business days", "notes": [], "availableForFormation": true},
  {"code": "WV", "name": "West Virginia", "slug": "west-virginia", "filingFee": 100, "recurringFeeAmount": 25, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$25 / year", "processingTimeLabel": "5–10 business days", "notes": [], "availableForFormation": true},
  {"code": "WI", "name": "Wisconsin", "slug": "wisconsin", "filingFee": 130, "recurringFeeAmount": 25, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$25 / year", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
  {"code": "WY", "name": "Wyoming", "slug": "wyoming", "filingFee": 100, "recurringFeeAmount": 60, "recurringFeeFrequency": "annual", "recurringFeeDescription": "$60 minimum / year", "processingTimeLabel": "immediately", "notes": [], "availableForFormation": true},
];

export function estimatedInitialTotal(servicePrice: number, state: USStateData | undefined): number | null {
  return state?.filingFee == null ? null : servicePrice + state.filingFee;
}
