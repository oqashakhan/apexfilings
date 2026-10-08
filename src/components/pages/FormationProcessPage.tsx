import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ArrowDown, ArrowRight, Building2, Check, ClipboardList, FolderLock, Landmark, TrendingUp } from 'lucide-react';
import './FormationProcessPage.css';

const stages = [
  { title: 'Submit Your Information', subtitle: 'Begin your business journey with Apex Filings.', icon: ClipboardList, label: 'A SIMPLE FIRST STEP', description: 'Start with a simple guided registration. Tell us a little about yourself, your preferred business structure, and where you would like to form your company.', checklist: ['Create your account', 'Select your business type', 'Provide your initial business details'] },
  { title: 'Form Your US Company', subtitle: 'Choose your state and begin the formation process.', icon: Building2, label: 'BUILD YOUR FOUNDATION', description: 'Choose from the available US states and continue your company formation through our guided process.', checklist: ['Choose your formation state', 'Prepare required formation information', 'Track your application progress'] },
  { title: 'Secure Your Business Documents', subtitle: 'Keep your important company information organized.', icon: FolderLock, label: 'EVERYTHING IN ITS PLACE', description: 'Access and manage your available business formation documents through your Apex Filings account as they become ready.', checklist: ['Formation documents', 'Available company records', 'Secure document management'] },
  { title: 'Set Up Your US Business Account', subtitle: 'Explore your next steps for business banking.', icon: Landmark, label: 'PREPARE FOR WHAT’S NEXT', description: 'Get guidance on preparing for a US business banking application, subject to provider eligibility and approval.', checklist: ['Review banking requirements', 'Prepare supporting documents', 'Explore eligible banking options'] },
  { title: 'Run & Grow Your Business', subtitle: 'Stay organized as your company grows.', icon: TrendingUp, label: 'YOUR NEXT CHAPTER', description: 'Continue managing your company through Apex Filings, with access to available services, documents, and ongoing compliance support.', checklist: ['Manage business documents', 'Track available compliance services', 'Access business support'] },
];

function FormationStage({ stage, index, startHref }: { stage: typeof stages[number]; index: number; startHref: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 62%', 'end 62%'] });
  const [active, setActive] = useState(false);
  useMotionValueEvent(scrollYProgress, 'change', value => setActive(value > 0));
  useEffect(() => setActive(scrollYProgress.get() > 0), [scrollYProgress]);
  const reveal = { initial: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: false, amount: 0.15 } };
  const Icon = stage.icon;
  return <section ref={ref} className={`formation-stage ${active ? 'is-active' : ''}`} aria-labelledby={`formation-step-${index}`}>
    <span className="formation-node" aria-hidden="true">{active ? <Check size={13} /> : <span />}</span>
    <div className="formation-stage-title">
      <motion.p {...reveal} transition={{ duration: reduceMotion ? 0 : .35 }} className="formation-step-number">0{index + 1}<span> / 05</span></motion.p>
      <motion.div {...reveal} transition={{ duration: reduceMotion ? 0 : .45, delay: reduceMotion ? 0 : .05 }}>
        <h2 id={`formation-step-${index}`}>{stage.title}</h2><p>{stage.subtitle}</p>
      </motion.div>
    </div>
    <motion.div {...reveal} transition={{ duration: reduceMotion ? 0 : .5, delay: reduceMotion ? 0 : .12 }} className="formation-story-card">
      <div className="formation-card-top"><span className="formation-card-icon"><Icon size={27} strokeWidth={1.6} /></span><span>{stage.label}</span></div>
      <p className="formation-description">{stage.description}</p>
      <ul>{stage.checklist.map(item => <li key={item}><Check size={15} aria-hidden="true" /><span>{item}</span></li>)}</ul>
      {index === 4 && <a href={startHref} className="formation-start">Start Your Business <ArrowRight size={18} aria-hidden="true" /></a>}
    </motion.div>
  </section>;
}

export function FormationProcessPage() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: timelineRef, offset: ['start 62%', 'end 62%'] });
  const state = new URLSearchParams(window.location.search).get('state');
  const startHref = state ? `/start?state=${encodeURIComponent(state)}` : '/start';
  useEffect(() => {
    document.title = 'How It Works | Apex Filings';
    return () => { document.title = 'Apex Filings | Start Your US Business With Confidence'; };
  }, []);
  return <div className="formation-process">
    <header className="formation-intro">
      <p className="formation-eyebrow">YOUR BUSINESS STARTS HERE</p>
      <h1>Launch Your US Business<br /><span>in 5 Simple Steps</span></h1>
      <p className="formation-intro-copy">From your first application to managing your US company, Apex Filings helps you navigate the process with clarity and confidence.</p>
      <a href="#formation-timeline" className="formation-scroll">Scroll to Explore <ArrowDown size={16} aria-hidden="true" /></a>
    </header>
    <div ref={timelineRef} id="formation-timeline" className="formation-timeline">
      <div className="formation-track" aria-hidden="true"><motion.div className="formation-progress" style={{ scaleY: scrollYProgress }} /></div>
      {stages.map((stage, index) => <FormationStage key={stage.title} stage={stage} index={index} startHref={startHref} />)}
    </div>
    <p className="formation-closing">One clear step at a time. Your business journey starts with you.</p>
  </div>;
}
