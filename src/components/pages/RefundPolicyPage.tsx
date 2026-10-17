import { useEffect } from 'react';
import './RefundPolicyPage.css';

const title = 'Refund Policy | Apex Filings';
const description = 'Read the Apex Filings Refund Policy to understand refund eligibility, government and third-party fees, processing rules, and how to request a refund.';

const sections = [
  {
    heading: 'General Refund Policy',
    paragraphs: [
      'Refund eligibility depends on the type of service purchased, the processing stage, work already completed, government charges, and third-party expenses. These factors are considered for each refund request.',
    ],
  },
  {
    heading: 'Refunds for LLC Formation Services',
    paragraphs: ['Refund eligibility for US LLC formation depends on when the request is made:'],
    bullets: [
      'Before processing begins: eligibility is assessed before formation work starts.',
      'After processing begins: work already completed is taken into account.',
      'After state submission: submitted work and applicable state filing fees are generally non-refundable.',
      'After successful formation: completed formation work is generally non-refundable.',
    ],
  },
  {
    heading: 'EIN Application Services',
    paragraphs: [
      'Refund eligibility for EIN assistance depends on the processing stage and work already completed. EIN processing and issuance timing is not guaranteed.',
    ],
  },
  {
    heading: 'Registered Agent and Business Address Services',
    paragraphs: [
      'Refund eligibility for registered agent and business address services depends on whether the service has been activated, the coverage period, any third-party provider charges, and any unused service period.',
    ],
  },
  {
    heading: 'LLC Compliance and Other Business Services',
    paragraphs: ['The processing stage and work already completed are considered for LLC compliance and other business services, including:'],
    bullets: [
      'Annual report filing',
      'LLC amendments',
      'Registered agent changes',
      'Certificates of Good Standing',
      'LLC dissolution',
      'Foreign-owned LLC tax filing assistance',
      'Resale certificate assistance',
      'Other administration and compliance services',
    ],
  },
  {
    heading: 'Government Fees and Third-Party Charges',
    paragraphs: [
      'Government and third-party charges are separate from Apex Filings service fees. They may be non-refundable, including when a government agency or third-party provider has already received payment.',
      'Apex Filings does not control government or third-party refund decisions. These charges may include:',
    ],
    bullets: [
      'Filing and state fees',
      'Registered agent charges',
      'Address service charges',
      'Expedited processing charges',
      'Other provider costs',
    ],
  },
  {
    heading: 'Incorrect Information Provided by Customers',
    paragraphs: [
      'Incorrect information provided by a customer may affect processing or require additional work. Any refund request is assessed in light of the processing stage and work already completed.',
    ],
  },
  {
    heading: 'Delays and Rejections',
    paragraphs: [
      'A delay or rejection does not by itself determine refund eligibility. The processing stage, work completed, and government or third-party expenses are considered.',
    ],
  },
  {
    heading: 'Duplicate Payments and Billing Errors',
    paragraphs: [
      'If you believe you made a duplicate payment or found a billing error, contact Apex Filings with the transaction reference so the payment can be reviewed.',
    ],
  },
  {
    heading: 'How to Request a Refund',
    paragraphs: [
      'Send your request to info@apexfilings.com and provide the following information:',
    ],
    bullets: [
      'Full name',
      'Order number or transaction reference',
      'Service purchased',
      'Date of payment',
      'Refund reason',
      'Supporting documents where applicable',
    ],
    closing: 'Apex Filings aims to respond to refund requests within 5–7 business days, but this is an intended response timeframe and not a guaranteed resolution period.',
  },
  {
    heading: 'Refund Processing Time',
    paragraphs: [
      'The intended 5–7 business day timeframe above refers to a response to the request. It is not a guaranteed period for resolving a request or completing a refund.',
    ],
  },
  {
    heading: 'Chargebacks and Payment Disputes',
    paragraphs: [
      'For a chargeback or payment dispute, the service purchased, processing stage, work completed, and any government or third-party expenses remain relevant to the transaction.',
    ],
  },
  {
    heading: 'Exceptions Required by Law',
    paragraphs: ['Any refund rights required by applicable law remain available.'],
  },
  {
    heading: 'Changes to This Policy',
    paragraphs: ['The effective date at the top of this page identifies this version of the Refund Policy.'],
  },
  {
    heading: 'Contact Us',
    paragraphs: ['Company: Apex Filings', 'Email: info@apexfilings.com', 'Website: https://apexfilings.com'],
  },
] as const;

export function RefundPolicyPage() {
  useEffect(() => {
    const previousTitle = document.title;
    const selectors = ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]'];
    const previousValues = selectors.map((selector) => document.querySelector<HTMLMetaElement>(selector)?.content);
    document.title = title;
    selectors.forEach((selector, index) => {
      const meta = document.querySelector<HTMLMetaElement>(selector);
      if (meta) meta.content = index === 0 || index === 2 || index === 4 ? description : title;
    });
    return () => {
      document.title = previousTitle;
      selectors.forEach((selector, index) => {
        const meta = document.querySelector<HTMLMetaElement>(selector);
        if (meta && previousValues[index] !== undefined) meta.content = previousValues[index];
      });
    };
  }, []);

  return (
    <div className="refund-policy-page">
      <header className="refund-policy-hero">
        <div className="refund-policy-container">
          <p className="refund-policy-eyebrow">Legal</p>
          <h1>Refund Policy</h1>
          <p className="refund-policy-date">Effective Date: <time dateTime="2026-10-16">October 16, 2026</time></p>
          <p className="refund-policy-intro">Refund eligibility depends on the type of service, the processing stage, work already completed, government charges, and third-party expenses.</p>
        </div>
      </header>

      <article className="refund-policy-container refund-policy-content">
        {sections.map((section, index) => (
          <section id={`refund-section-${index + 1}`} key={section.heading} aria-labelledby={`refund-heading-${index + 1}`}>
            <h2 id={`refund-heading-${index + 1}`}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {'bullets' in section && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
            {'closing' in section && <p className="refund-policy-note">{section.closing}</p>}
          </section>
        ))}
      </article>
    </div>
  );
}
