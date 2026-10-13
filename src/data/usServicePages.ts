import type { FAQItem } from '../types';

export interface UsServicePage {
  id: string;
  title: string;
  pageTitle: string;
  pageDescription: string;
  h1: string;
  intro: string;
  what: string;
  who: string;
  included: string[];
  process: string[];
  needs: string[];
  goodToKnow: string;
  faqs: FAQItem[];
  related: { label: string; href?: string }[];
  cta: string;
}

// Approved copy from the client's US LLC Service Pages PDF. Unconfirmed
// items in that document are intentionally excluded until approved.
export const US_SERVICE_PAGES: UsServicePage[] = [
  {
    id: 'ein',
    title: 'EIN Application',
    pageTitle: 'EIN Application for Non-US Residents | Apex Filings',
    pageDescription: 'Get help applying for your US EIN without an SSN. Apex Filings prepares and submits your IRS application and guides you through each step.',
    h1: 'EIN Application for Non-US Residents',
    intro: 'An EIN is the tax ID your US company needs for banking, taxes and payment platforms. We prepare and submit your application so you do not have to work through the IRS process alone.',
    what: 'An Employer Identification Number (EIN) is a 9-digit number issued by the IRS to identify your business for tax purposes.',
    who: 'Every new US LLC owned by a non-US resident that wants to open a US bank account, accept payments, file US taxes or hire workers.',
    included: ['Information checklist so your application is complete', 'Preparation of IRS Form SS-4 for your LLC', 'Submission of your application to the IRS', 'Guidance for applicants who have no SSN or ITIN', 'Delivery of your IRS confirmation once received'],
    process: ['Complete your LLC formation first.', 'Send us your company and responsible party details.', 'We prepare your Form SS-4 and you review it.', 'We submit your application to the IRS.', 'The IRS issues your EIN and confirmation.', 'We send you the confirmation and explain the next steps.'],
    needs: ['Your LLC formation documents', 'Full name, address and country of the responsible party (usually the owner)', 'Passport or other identity details of the responsible party', 'A short description of your business activity'],
    goodToKnow: 'The IRS issues EINs at no charge. Our fee covers preparing and submitting your application. Applicants without an SSN or ITIN usually cannot use the IRS online form and apply by fax, mail or phone instead, so timing depends on the IRS.',
    faqs: [{ id: 'ein-ssn', question: 'Do I need an SSN to get an EIN?', answer: 'No. Non-US applicants without an SSN or ITIN can apply using Form SS-4.' }, { id: 'ein-time', question: 'How long does it take?', answer: 'The time depends on the IRS and the method used. We tell you the expected timing when we submit.' }],
    related: [{ label: 'LLC Formation', href: '/services/llc-formation' }, { label: 'US Business Bank Account Support', href: '/services/business-banking' }, { label: 'ITIN Application', href: '/services/itin' }],
    cta: 'Get My EIN',
  },
  {
    id: 'registered-agent',
    title: 'Registered Agent Service',
    pageTitle: 'US Registered Agent Service | Apex Filings',
    pageDescription: 'Every US LLC needs a registered agent. Apex Filings provides a US address for legal and government notices and forwards them to you online.',
    h1: 'Registered Agent Service for Your US LLC',
    intro: 'Every US LLC must have a registered agent with a US address. We act as your agent, receive official documents and send them to you online.',
    what: 'A registered agent is the person or company named in your state filing to receive legal papers, government notices and tax mail for your LLC.',
    who: 'Every LLC. The agent must have a physical street address in the state where the LLC is formed, which is not possible for most founders living abroad.',
    included: ['Apex Filings listed as your registered agent in the state', 'Receipt of legal and official government documents', 'Digital copies of documents sent to your email or account', '1 full year of service in the Basic package', 'Renewal reminder before your term ends'],
    process: ['Choose your formation package. Registered agent is included.', 'We list Apex Filings as your agent in your state filing.', 'Official documents arrive at our address.', 'We scan them and send them to you.', 'We remind you before renewal.'],
    needs: ['Your LLC name and state', 'An email address where we can send notices'],
    goodToKnow: 'The registered agent address appears in public state records. Missing legal notices can lead to penalties or default judgments, so check your email regularly. You can change your agent at any time.',
    faqs: [{ id: 'ra-own', question: 'Can I be my own registered agent?', answer: 'Only if you have a physical address in the state and are available there during business hours. This does not work for most non-residents.' }, { id: 'ra-mail', question: 'Is this the same as a mailing address?', answer: 'No. The registered agent handles legal and government notices. See our US Address and Mail Forwarding service for general business mail.' }],
    related: [{ label: 'LLC Formation', href: '/services/llc-formation' }, { label: 'US Address & Mail Forwarding', href: '/services/mail-forwarding' }, { label: 'Change Registered Agent' }],
    cta: 'Add Registered Agent',
  },
  {
    id: 'mail-forwarding',
    title: 'US Address & Mail Forwarding',
    pageTitle: 'US Business Address & Mail Forwarding | Apex Filings',
    pageDescription: 'Get a real US business address for your LLC. We receive your mail, scan it and forward it to you, wherever you live in the world.',
    h1: 'US Business Address with Mail Forwarding',
    intro: 'Give your LLC a US address for banks, the IRS and your customers. We receive your mail and send it to you online.',
    what: 'A US business address where your company can receive letters and parcels. Mail is scanned or forwarded to you, wherever you are.',
    who: 'Founders outside the US who need a US address for bank applications, tax letters, payment platforms and business correspondence.',
    included: ['A US business address for your LLC', 'Mail received on your behalf', 'Scanned copies of letters sent to you online', 'Included in the Basic package'],
    process: ['Choose a package with US address included.', 'Complete a short identity verification (required by US postal rules for mail receiving services).', 'Receive your US address.', 'Use it for your business accounts and correspondence.', 'We scan new mail and notify you.'],
    needs: ['Your LLC details', 'Identity documents for the verification'],
    goodToKnow: 'Some banks and platforms do not accept shared or virtual addresses. Check their rules before you apply. Government and legal notices go to your registered agent address.',
    faqs: [],
    related: [{ label: 'Registered Agent Service', href: '/services/registered-agent' }, { label: 'US Business Bank Account Support', href: '/services/business-banking' }],
    cta: 'Get My US Address',
  },
  {
    id: 'business-banking',
    title: 'US Business Bank Account Support',
    pageTitle: 'US Business Bank Account Support | Apex Filings',
    pageDescription: 'Open a US business bank account as a non-resident. Apex Filings prepares your documents and introduces you to trusted banking providers.',
    h1: 'US Business Bank Account Support for Non-Residents',
    intro: 'A US business account helps you accept payments and keep business money separate. We prepare your documents and introduce you to banking providers.',
    what: 'Guidance and introductions to online banking providers that work with non-resident founders.',
    who: 'Founders with a US LLC and EIN who need a US account for clients, marketplaces and payment platforms.',
    included: ['Document checklist for bank applications', 'Review of your documents before you apply', 'Introductions to banking providers', 'Guidance on common questions banks ask'],
    process: ['Complete your LLC formation and EIN.', 'We review your documents against the bank checklist.', 'We introduce you to a suitable provider.', 'You submit the application online.', 'The bank reviews and decides.', 'We help with follow-up questions if needed.'],
    needs: ['Formation documents and EIN confirmation', 'Operating agreement', 'Passport and proof of address', 'A clear description of your business'],
    goodToKnow: 'Apex Filings is not a bank. Each provider makes its own decision, and we cannot guarantee approval. Banks may ask for extra information or a video call.',
    faqs: [{ id: 'bank-approval', question: 'Will my account be approved?', answer: 'We cannot promise this. Complete, accurate documents improve your chances.' }],
    related: [{ label: 'EIN Application', href: '/services/ein' }, { label: 'Operating Agreement', href: '/services/operating-agreement' }, { label: 'US Address & Mail Forwarding', href: '/services/mail-forwarding' }],
    cta: 'Get Banking Support',
  },
  {
    id: 'operating-agreement',
    title: 'Operating Agreement',
    pageTitle: 'LLC Operating Agreement Service | Apex Filings',
    pageDescription: 'Get a clear operating agreement for your US LLC. It sets out ownership and management and is often required by banks. Prepared online.',
    h1: 'LLC Operating Agreement',
    intro: 'An operating agreement sets out who owns your LLC and how it is run. We prepare it for you online so your company records are ready for banks and partners.',
    what: 'An internal legal document that describes the ownership, management and rules of your LLC. It is kept with your records and is not filed with the state.',
    who: 'Every LLC. Some states, such as New York, require one in writing, and banks and payment platforms usually ask for it.',
    included: ['Operating agreement for a single-member or multi-member LLC', 'Member names and ownership percentages', 'Management structure and decision-making rules', 'Rules for profits, distributions and adding or removing members'],
    process: ['Tell us whether you have one owner or several.', 'Answer a short questionnaire.', 'We prepare your draft.', 'You review it and ask for changes.', 'All members sign.', 'Keep your copy with your company records.'],
    needs: ['Company name and state', 'Owner names and ownership percentages', 'Who will manage the company'],
    goodToKnow: 'For complex ownership, investors or disputes between partners, speak to a lawyer. Our agreement is a standard template, not tailored legal advice.',
    faqs: [{ id: 'oa-filed', question: 'Is it filed with the state?', answer: 'No. Keep it with your records and give a copy to your bank when asked.' }, { id: 'oa-single', question: 'Do I need one for a single-member LLC?', answer: 'We recommend it. It supports your separate company status and banks usually ask for it.' }],
    related: [{ label: 'LLC Formation', href: '/services/llc-formation' }, { label: 'US Business Bank Account Support', href: '/services/business-banking' }],
    cta: 'Get My Operating Agreement',
  },
  {
    id: 'business-licenses',
    title: 'Business Licenses & Permits',
    pageTitle: 'Business Licenses & Permits Guidance | Apex Filings',
    pageDescription: 'Find out which federal, state and local licenses your US LLC may need. Apex Filings researches your requirements and gives a clear checklist.',
    h1: 'Business Licenses and Permits for Your US LLC',
    intro: 'Licenses depend on what your business does and where it operates. We research the requirements for you and give you a clear checklist.',
    what: 'A research and guidance service that identifies the federal, state and local licenses, permits and registrations your business activity may need.',
    who: 'Founders who sell products, offer regulated services, operate from a physical location or sell to US customers. Many online-only businesses need few licenses, but it depends on the activity.',
    included: ['Review based on your business activity', 'Research of federal, state and local requirements', 'Sales tax registration check', 'Written checklist of the licenses to review', 'Guidance on where and how to apply'],
    process: ['Tell us your business activity, state and city.', 'We research the requirements.', 'You receive your checklist.', 'You apply.', 'Keep your licenses on file and note renewal dates.'],
    needs: ['A description of what your business sells or does', 'Your state and city of operation', 'Whether you sell to US customers'],
    goodToKnow: 'Rules change and differ by city. Our checklist is a starting point, not legal advice.',
    faqs: [{ id: 'license-every', question: 'Does every LLC need a license?', answer: 'No. It depends on the activity and location.' }, { id: 'license-tax', question: 'Does this include a sales tax permit?', answer: 'We check whether you need to register for sales tax.' }],
    related: [{ label: 'LLC Formation', href: '/services/llc-formation' }, { label: 'Annual Report Filing', href: '/services/annual-report' }],
    cta: 'Check My License Needs',
  },
  {
    id: 'itin',
    title: 'ITIN Application',
    pageTitle: 'ITIN Application Help for Non-Residents | Apex Filings',
    pageDescription: 'Find out if you need a US ITIN and get help with your IRS application. Apex Filings guides non-residents through each document and step.',
    h1: 'ITIN Application Help for Non-US Residents',
    intro: 'Not everyone needs an ITIN. We check whether you do and guide you through the IRS application.',
    what: 'An Individual Taxpayer Identification Number (ITIN) is a tax ID issued by the IRS to people who must file US taxes but cannot get a Social Security Number.',
    who: 'Non-residents who must file a US tax return, claim a tax treaty benefit or meet a bank or platform requirement. Many non-resident LLC owners do not need an ITIN.',
    included: ['Eligibility check', 'Document checklist', 'Preparation of IRS Form W-7', 'Guidance on certified identity documents', 'Follow-up guidance until the IRS replies'],
    process: ['We check whether you need an ITIN.', 'You send your identity documents.', 'We prepare Form W-7 and any supporting forms.', 'Your identity documents are verified through an approved method.', 'The application is sent to the IRS.', 'You receive your ITIN by mail from the IRS.'],
    needs: ['Valid passport (usually required)', 'Proof of your reason for needing an ITIN', 'Your foreign address and tax details'],
    goodToKnow: 'The IRS decides and sets the timeline, which can be several weeks or longer. ITIN applications generally travel with a tax return unless an exception applies.',
    faqs: [{ id: 'itin-llc', question: 'Do I need an ITIN to form an LLC or get an EIN?', answer: 'No.' }, { id: 'itin-ein', question: 'Is an ITIN the same as an EIN?', answer: 'No. An ITIN identifies a person. An EIN identifies a business.' }],
    related: [{ label: 'EIN Application', href: '/services/ein' }, { label: 'Tax Filing for Foreign-Owned LLCs' }],
    cta: 'Check If I Need an ITIN',
  },
  {
    id: 'trademark',
    title: 'Trademark Registration',
    pageTitle: 'US Trademark Registration Service | Apex Filings',
    pageDescription: 'Protect your brand name or logo in the US. Apex Filings guides you through trademark search, USPTO filing and follow-up.',
    h1: 'US Trademark Registration for Your Brand',
    intro: 'Protect your business name or logo with a US federal trademark. We guide you from search to filing and follow-up.',
    what: 'A trademark is a legal right to use a name, logo or slogan to identify your products or services. A US federal trademark is registered with the United States Patent and Trademark Office (USPTO).',
    who: 'Founders building a brand who want to stop others from using a confusingly similar name or logo in the US.',
    included: ['Trademark search to check for similar marks', 'Help choosing the right class for your goods or services', 'Preparation and filing of your USPTO application', 'Monitoring of your application and response to USPTO notices', 'Final registration certificate'],
    process: ['Tell us your brand name or logo and what it is used for.', 'We run a trademark search.', 'We recommend the class or classes to file in.', 'The application is filed with the USPTO.', 'A USPTO examiner reviews it, and may ask for changes.', 'If approved, the mark is published and then registered.'],
    needs: ['Brand name or logo file', 'Description of your products or services', 'Owner details (usually your LLC)', 'Proof of use, if you already use the brand'],
    goodToKnow: 'USPTO fees are paid per class and are additional. Registration usually takes a year or more, and approval is not guaranteed. Applicants who live outside the US must be represented by a US-licensed attorney.',
    faqs: [{ id: 'tm-llc', question: 'Does forming an LLC protect my brand name?', answer: 'No. State registration only stops identical company names in that state. Only a trademark protects your brand more widely.' }, { id: 'tm-guarantee', question: 'Is registration guaranteed?', answer: 'No. The USPTO can refuse a mark, for example if it is too similar to an existing one.' }],
    related: [{ label: 'LLC Formation', href: '/services/llc-formation' }, { label: 'Operating Agreement', href: '/services/operating-agreement' }],
    cta: 'Protect My Brand',
  },
  {
    id: 'consultation',
    title: 'Business Formation Consultation',
    pageTitle: 'Free US Business Formation Consultation | Apex Filings',
    pageDescription: 'Book a free call to choose your state, package and next steps for your US LLC. Clear answers for non-resident founders.',
    h1: 'Free Business Formation Consultation',
    intro: 'Not sure where to start? Book a free call and get clear answers on states, packages and next steps for your US company.',
    what: 'A free one-to-one call with an Apex Filings specialist who explains the formation process for non-resident founders.',
    who: 'Anyone comparing states, unsure which package to choose, or wanting to understand EIN, banking and compliance before they start.',
    included: ['Review of your business idea and goals', 'Help comparing states and packages', 'Overview of EIN, banking and yearly compliance', 'Answers to your questions', 'A clear recommended next step'],
    process: ['Click Book Free Consultation.', 'Pick a date and time.', 'Tell us briefly about your business.', 'Join the call.', 'Receive a recommended next step by email.'],
    needs: ['Your name, country and email', 'A short description of your business', 'Your questions, if you have any'],
    goodToKnow: 'The consultation is general guidance, not legal or tax advice. There is no obligation to buy.',
    faqs: [{ id: 'consult-prepare', question: 'What should I prepare?', answer: 'A short description of your business, your country and your questions.' }],
    related: [{ label: 'LLC Formation', href: '/services/llc-formation' }, { label: 'US Business Bank Account Support', href: '/services/business-banking' }],
    cta: 'Book Free Consultation',
  },
];

export const getUsServicePage = (slug: string) => US_SERVICE_PAGES.find((page) => page.id === slug);
