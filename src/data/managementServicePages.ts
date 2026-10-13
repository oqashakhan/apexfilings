import type { FAQItem } from '../types';

export interface ManagementServicePageData {
  id: string;
  title: string;
  description: string;
  who: string;
  included: string[];
  process: string[];
  needs: string[];
  apexFee: number;
  pricing: string;
  stateFee: string;
  processingTime: string;
  important: string[];
  faqs: FAQItem[];
  cta: string;
}

// Publishable entries from the owner-supplied Business Management document.
// Services with unresolved owner-confirmation items have no public route yet.
export const MANAGEMENT_SERVICE_PAGES: ManagementServicePageData[] = [
  {
    id: 'annual-report',
    title: 'Annual Report Filing',
    description: 'Many states require an LLC to file an annual or periodic report to remain in good standing. Apex Filings prepares and submits the report before the deadline.',
    who: 'LLCs registered in states that require annual or periodic reports. Due dates and fees vary by state.',
    included: ['Check state deadline and requirements', 'Prepare and file the report', 'Provide filing confirmation', 'Send a reminder for the next year'],
    process: ['Customer provides LLC name and state.', 'Apex confirms what is due and when.', 'Customer reviews/approves the information.', 'Apex files with the state.', 'Apex sends the confirmation.'],
    needs: ['LLC name and state', 'Current owner/manager details', 'Registered agent details', 'State login details, if required'],
    apexFee: 70,
    pricing: 'Apex fee: US$70. State fee or tax is additional and varies by state.',
    stateFee: 'State fee or tax is additional and varies by state.',
    processingTime: 'Varies by state. File after all required information is received; the state controls processing.',
    important: ['Missing a deadline may result in penalties or administrative dissolution.', 'Some states do not require an annual report.'],
    faqs: [{ id: 'annual-due', question: 'When is my report due?', answer: 'It depends on the state and formation date.' }, { id: 'annual-missed', question: 'What if I missed the deadline?', answer: 'Contact Apex promptly; reinstatement may be required.' }, { id: 'annual-state-fee', question: 'Is the state fee included?', answer: 'No. It is charged in addition to the US$70 Apex fee.' }, { id: 'annual-time', question: 'How long does it take?', answer: 'Timing depends on the state.' }],
    cta: 'File My Annual Report',
  },
  {
    id: 'resale-certificate',
    title: 'Resale Certificate',
    description: 'Help prepare the state resale certificate or applicable form for eligible business purchases intended for resale, subject to state rules.',
    who: 'LLCs that buy goods for resale, commonly online sellers, retailers, and wholesalers.',
    included: ['Check basic state eligibility and requirements', 'Guidance on sales-tax registration', 'Prepare the applicable resale certificate', 'Provide copies for suppliers'],
    process: ['Customer explains what they sell and where.', 'Apex checks state rules and eligibility.', 'Apex prepares the certificate or applicable form.', 'Customer uses it with suppliers, subject to state rules.'],
    needs: ['LLC name', 'State sales-tax permit number, if available', 'Description of goods', 'Supplier details'],
    apexFee: 60,
    pricing: 'Apex fee: US$60. State fee is additional only if charged. Sales-tax registration may have a separate fee.',
    stateFee: 'State fee is additional only if charged. Sales-tax registration may have a separate fee.',
    processingTime: 'Varies by state.',
    important: ['A sales-tax registration or permit is usually needed first, depending on the state.', 'Rules differ by state and goods; services generally are not treated as resale goods.'],
    faqs: [{ id: 'resale-services', question: 'Do I need one for services?', answer: 'Usually not, according to the supplied service brief.' }, { id: 'resale-permit', question: 'Do I need a sales-tax permit first?', answer: 'In most states, yes; requirements vary.' }, { id: 'resale-everywhere', question: 'Is it valid in every state?', answer: 'No. Rules vary by state.' }, { id: 'resale-fee', question: 'Is there a state fee?', answer: 'Only if the state charges one; it is additional to the US$60 Apex fee.' }, { id: 'resale-time', question: 'How long does it take?', answer: 'It depends on the state.' }],
    cta: 'Get My Resale Certificate',
  },
  {
    id: 'dissolve-llc',
    title: 'LLC Dissolution',
    description: 'Help formally close an LLC by preparing and filing state dissolution documents and providing a checklist of remaining closing tasks.',
    who: 'Owners who are closing their business or no longer need the LLC.',
    included: ['Check for unpaid state fees or reports', 'Prepare and file Articles of Dissolution or the applicable state form', 'Provide a closing checklist for tax, bank, and licenses', 'Provide filing confirmation'],
    process: ['Customer provides LLC details and reason for closing.', 'Apex checks known outstanding requirements.', 'Apex prepares the dissolution filing.', 'Customer reviews and approves it.', 'Apex files with the state.', 'Customer completes remaining closure tasks on the checklist.'],
    needs: ['LLC name and state', 'Owner approval', 'Final annual-report details, if due'],
    apexFee: 70,
    pricing: 'Apex fee: US$70. State dissolution fee is additional and varies by state.',
    stateFee: 'State dissolution fee is additional and varies by state.',
    processingTime: 'Varies by state.',
    important: ['Dissolution does not cancel debts or all tax obligations.', 'Final tax returns and any required Form 5472 may still be due.', 'Close bank accounts and notify the registered agent after the filing is accepted, as applicable.'],
    faqs: [{ id: 'dissolution-fees', question: 'Will I still owe fees?', answer: 'Outstanding fees or requirements may need to be resolved.' }, { id: 'dissolution-ein', question: 'Does dissolution cancel my EIN?', answer: 'The source says an EIN is not cancelled; the IRS must be notified to close the business account.' }, { id: 'dissolution-reopen', question: 'Can I reopen the LLC later?', answer: 'Only through reinstatement and where state rules allow it.' }, { id: 'dissolution-cost', question: 'How much does it cost?', answer: 'US$70 plus the state dissolution fee.' }],
    cta: 'Dissolve My LLC',
  },
];

export const getManagementServicePage = (slug: string) => MANAGEMENT_SERVICE_PAGES.find((page) => page.id === slug);
