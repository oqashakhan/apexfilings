import { useEffect, type ReactNode } from 'react';
import policySource from '../../data/privacyPolicy.md?raw';
import './RefundPolicyPage.css';

type Block = { type: 'paragraph' | 'subheading'; text: string } | { type: 'list'; items: string[] };
type PolicySection = { number: string; heading: string; blocks: Block[] };

function parsePolicy(source: string) {
  const introduction: Block[] = [];
  const sections: PolicySection[] = [];
  let current: PolicySection | undefined;

  for (const rawLine of source.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('# ') || line.startsWith('**Effective Date:**')) continue;

    const sectionMatch = /^## (\d+)\. (.+)$/.exec(line);
    if (sectionMatch) {
      current = { number: sectionMatch[1], heading: sectionMatch[2], blocks: [] };
      sections.push(current);
      continue;
    }

    const blocks = current?.blocks ?? introduction;
    if (line.startsWith('- ')) {
      const previous = blocks.at(-1);
      if (previous?.type === 'list') previous.items.push(line.slice(2));
      else blocks.push({ type: 'list', items: [line.slice(2)] });
    } else if (/^\*\*[^*]+\*\*$/.test(line)) {
      blocks.push({ type: 'subheading', text: line.slice(2, -2) });
    } else {
      blocks.push({ type: 'paragraph', text: line });
    }
  }

  return { introduction, sections };
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('https://')) {
      const url = part.replace(/[.,;:]$/, '');
      return <span key={index}><a href={url} className="legal-document-link">{url}</a>{part.slice(url.length)}</span>;
    }
    return part;
  });
}

function renderBlocks(blocks: Block[]) {
  return blocks.map((block, index) => {
    if (block.type === 'subheading') return <h3 key={index}>{block.text}</h3>;
    if (block.type === 'list') return <ul key={index}>{block.items.map((item) => <li key={item}>{renderInline(item)}</li>)}</ul>;
    return <p key={index}>{renderInline(block.text)}</p>;
  });
}

const policy = parsePolicy(policySource);
const pageTitle = 'Privacy Policy | Apex Filings';
const pageDescription = 'Read the Apex Filings Privacy Policy to learn how we collect, use, store, and share information when providing business formation and related services.';

export function PrivacyPolicyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="refund-policy-date">Effective Date: <time dateTime="2026-10-16">October 16, 2026</time></p>
        <div className="refund-policy-intro">{renderBlocks(policy.introduction)}</div>
      </div>
    </header>
    <article className="refund-policy-container refund-policy-content">
      {policy.sections.map((section) => <section key={section.number} id={`privacy-section-${section.number}`} aria-labelledby={`privacy-heading-${section.number}`}>
        <h2 id={`privacy-heading-${section.number}`}><span aria-hidden="true">{section.number.padStart(2, '0')}</span>{section.heading}</h2>
        {renderBlocks(section.blocks)}
      </section>)}
    </article>
  </div>;
}
