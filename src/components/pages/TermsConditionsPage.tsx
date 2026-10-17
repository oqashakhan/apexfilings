import { useEffect } from 'react';
import './RefundPolicyPage.css';

const pageTitle = 'Terms of Service | Apex Filings';
const pageDescription = 'Read the Apex Filings Terms of Service governing business formation, compliance services, payments, customer responsibilities, refunds, third-party services, and use of our website.';

const sections = [
  {
    heading: 'Scope of Services',
    paragraphs: [
      'Apex Filings provides US LLC formation and related business services. Available services include EIN assistance, registered agent and business address services, LLC amendments, annual report filing, tax filing assistance, Certificates of Good Standing, LLC dissolution, resale certificate assistance, banking application assistance, and payment solution guidance.',
      'The scope of a particular service is described on its service page, in the selected package, or in a written communication about that service.',
    ],
  },
  {
    heading: 'Account Registration and Customer Information',
    paragraphs: [
      'A service request may require an account, additional information, or documents before work can begin. Please provide accurate and complete business, owner, contact, and filing details where applicable. Incorrect or incomplete information can delay processing or require additional work.',
      'If you create an account, keep your credentials confidential and contact us if you suspect unauthorized access.',
    ],
  },
  {
    heading: 'Nature of Our Services and Professional Advice',
    paragraphs: [
      'Apex Filings is a business formation service. It is not automatically acting as a law firm, accounting firm, tax advisory firm, bank, or financial institution. Website materials and service communications are informational and do not replace legal, accounting, tax, investment, or financial advice from an appropriately qualified professional.',
    ],
  },
  {
    heading: 'Orders, Pricing, and Payments',
    paragraphs: [
      'The Basic LLC Formation package costs $199 and the Premium All-In package costs $299, each plus applicable state filing fees. Apex Filings service fees are separate from government filing fees and any third-party charges. Review the displayed package details or written quote before proceeding.',
      'The fees for other services depend on the service, state or jurisdiction, selected options, and applicable external provider costs.',
    ],
  },
  {
    heading: 'Company Formation and Filing Services',
    paragraphs: [
      'Company formation and filing services depend on the information and documents you provide and on the relevant government agency. A name-availability check or submitted filing does not guarantee company-name acceptance or government approval. Government processing times are estimates, not guaranteed completion dates.',
    ],
  },
  {
    heading: 'EIN, Tax Filing, and Compliance Assistance',
    paragraphs: [
      'Apex Filings offers EIN application assistance, tax filing assistance, and ongoing LLC management and compliance services where described for the selected service. EIN issuance and timing are determined by the relevant authority; assistance does not guarantee issuance or a particular processing time.',
    ],
  },
  {
    heading: 'Registered Agent, Business Address, and Mail Services',
    paragraphs: [
      'Registered agent, business address, and any mail-related services are provided only to the extent stated in the selected package or service description. Availability, coverage, and any provider charges depend on the service selected and the relevant provider.',
    ],
  },
  {
    heading: 'Customer Responsibilities and Legal Compliance',
    paragraphs: [
      'You are responsible for supplying accurate and complete information and the documents needed for your requested service. Please respond to requests for clarification so a filing or application can proceed. You remain responsible for understanding and meeting the legal, tax, and business obligations that apply to your company.',
    ],
  },
  {
    heading: 'Third-Party Providers and Processing Delays',
    paragraphs: [
      'Some services involve government filing offices, the Internal Revenue Service, registered agent or address providers, banks, payment providers, or other third parties. Those organizations control their own eligibility, processing, and approval decisions.',
      'Apex Filings cannot guarantee government approval, company-name acceptance, EIN issuance, bank-account approval, payment-provider approval, third-party service decisions, or any estimated processing time.',
    ],
  },
  {
    heading: 'Refunds, Cancellations, and Service Termination',
    paragraphs: [
      'Refund eligibility depends on the service, processing stage, work already completed, government charges, and third-party expenses. For applicable details and the request process, read the Refund Policy. For questions about a cancellation or service request, contact info@apexfilings.com.',
    ],
    link: { href: '/refund-policy', label: 'Read the Refund Policy' },
  },
  {
    heading: 'Website Use and Intellectual Property',
    paragraphs: [
      'These Terms also apply to access to the Apex Filings website and related digital platforms. Website materials are provided to explain our services and support customer requests.',
    ],
  },
  {
    heading: 'Privacy and Electronic Communications',
    paragraphs: [
      'Our Privacy Policy explains how customer information and documents are collected, used, stored, and shared when you use our website, create an account, request services, make payments, or communicate with us. Apex Filings may contact you about information or documents needed to process a service request.',
    ],
    link: { href: '/privacy-policy', label: 'Read the Privacy Policy' },
  },
  {
    heading: 'Disclaimers and Limitation of Liability',
    paragraphs: [
      'Website materials and service communications are informational and are not a guarantee of any government or third-party outcome. Decisions and processing by agencies, banks, payment providers, and other third parties are outside Apex Filings’ control.',
    ],
  },
  {
    heading: 'Complaints, Disputes, and Events Beyond Our Control',
    paragraphs: [
      'If you have a concern about a service or payment, contact info@apexfilings.com with the details so it can be reviewed. Government and third-party processing delays or decisions can affect delivery of a requested service.',
    ],
  },
  {
    heading: 'General Provisions and Contact Information',
    paragraphs: [
      'The effective date at the top of this page identifies this version of the Terms of Service. For questions about these Terms or a service request, contact Apex Filings at info@apexfilings.com.',
      'Website: https://apexfilings.com',
    ],
  },
] as const;

export function TermsConditionsPage() {
  useEffect(() => {
    const previousTitle = document.title;
    const selectors = ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]'];
    const previous = selectors.map((selector) => document.querySelector<HTMLMetaElement>(selector)?.content);
    document.title = pageTitle;
    selectors.forEach((selector, index) => {
      const meta = document.querySelector<HTMLMetaElement>(selector);
      if (meta) meta.content = index === 0 || index === 2 || index === 4 ? pageDescription : pageTitle;
    });
    return () => {
      document.title = previousTitle;
      selectors.forEach((selector, index) => {
        const meta = document.querySelector<HTMLMetaElement>(selector);
        if (meta && previous[index] !== undefined) meta.content = previous[index];
      });
    };
  }, []);

  return <div className="refund-policy-page legal-document-page">
    <header className="refund-policy-hero">
      <div className="refund-policy-container">
        <p className="refund-policy-eyebrow">Legal</p>
        <h1>Terms of Service</h1>
        <p className="refund-policy-date">Effective Date: <time dateTime="2026-10-16">October 16, 2026</time></p>
        <p className="refund-policy-intro">These Terms of Service govern access to the Apex Filings website, our services and related digital platforms, and purchases made through Apex Filings. By using our website or purchasing a service, you accept these Terms.</p>
      </div>
    </header>
    <article className="refund-policy-container refund-policy-content">
      {sections.map((section, index) => <section key={section.heading} id={`terms-section-${index + 1}`} aria-labelledby={`terms-heading-${index + 1}`}>
        <h2 id={`terms-heading-${index + 1}`}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{section.heading}</h2>
        {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {'link' in section && section.link && <p><a className="legal-document-link" href={section.link.href}>{section.link.label}</a></p>}
      </section>)}
    </article>
  </div>;
}
