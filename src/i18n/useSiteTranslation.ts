import { useEffect, useRef } from 'react';
import { approvedTranslation } from './approvedTranslations';
import { isRightToLeft, type Language } from './languages';

type Target = { node: Text | Element; attribute?: string; english: string; rendered: string };
const translatedAttributes = ['placeholder', 'aria-label', 'title', 'alt'];
const ignoredParents = 'script,style,svg,code,pre,textarea,[contenteditable],[translate="no"],[data-no-translate]';
const memory = new Map<string, Map<string, string>>();

function shouldTranslate(value: string): boolean {
  const text = value.trim();
  return text.length > 1 && text !== 'Apex Filings' && /[A-Za-z]/.test(text) && !/^(?:https?:|mailto:|tel:)/i.test(text)
    && !/^[\d\s.,%$€£+:/()\-–—]+$/.test(text) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function readCache(language: Language): Map<string, string> {
  if (memory.has(language)) return memory.get(language)!;
  let stored: Record<string, string> = {};
  try { stored = JSON.parse(window.sessionStorage.getItem(`apex-translation-v1-${language}`) || '{}'); } catch { /* Storage may be unavailable. */ }
  const cache = new Map(Object.entries(stored));
  memory.set(language, cache);
  return cache;
}

function saveCache(language: Language, cache: Map<string, string>): void {
  try { window.sessionStorage.setItem(`apex-translation-v1-${language}`, JSON.stringify(Object.fromEntries([...cache].slice(-1200)))); } catch { /* Page remains usable. */ }
}

export function useSiteTranslation(language: Language, onUnavailable: () => void): void {
  const unavailableRef = useRef(onUnavailable);
  unavailableRef.current = onUnavailable;

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const originalLang = document.documentElement.lang;
    const originalDir = document.documentElement.dir;
    if (language === 'en') {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
      return;
    }

    const targets = new Map<Text | Element, Map<string, Target>>();
    const cache = readCache(language);
    const pending = new Set<string>();
    let stopped = false;
    let busy = false;
    let timer = 0;
    let failures = 0;

    const record = (node: Text | Element, attribute: string | undefined, current: string) => {
      const key = attribute ?? '#text';
      let entries = targets.get(node);
      if (!entries) { entries = new Map(); targets.set(node, entries); }
      let target = entries.get(key);
      if (!target) {
        target = { node, attribute, english: current, rendered: current };
        entries.set(key, target);
      } else if (current !== target.rendered) {
        // React may replace a previously translated string after an interaction.
        target.english = current;
        target.rendered = current;
      }
      return target;
    };

    const write = (target: Target, value: string) => {
      if (target.rendered === value) return;
      target.rendered = value;
      if (target.attribute) (target.node as Element).setAttribute(target.attribute, value);
      else (target.node as Text).nodeValue = value;
    };

    const scan = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentElement;
          if (!parent || parent.closest(ignoredParents)) continue;
          const current = node.nodeValue ?? '';
          if (!shouldTranslate(current)) continue;
          const target = record(node as Text, undefined, current);
          const replacement = approvedTranslation(language, target.english.trim()) ?? cache.get(target.english.trim());
          if (replacement) write(target, target.english.replace(target.english.trim(), replacement));
          else pending.add(target.english.trim());
        } else {
          const element = node as Element;
          if (element.closest(ignoredParents)) continue;
          for (const attribute of translatedAttributes) {
            const current = element.getAttribute(attribute);
            if (!current || !shouldTranslate(current)) continue;
            const target = record(element, attribute, current);
            const replacement = approvedTranslation(language, target.english.trim()) ?? cache.get(target.english.trim());
            if (replacement) write(target, replacement);
            else pending.add(target.english.trim());
          }
        }
      }
    };

    const translate = async () => {
      if (stopped || busy) return;
      scan();
      const batch: string[] = [];
      let characters = 0;
      for (const value of pending) {
        if (cache.has(value) || approvedTranslation(language, value)) { pending.delete(value); continue; }
        if (value.length > 5000) { pending.delete(value); continue; }
        if (batch.length === 50 || characters + value.length > 18000) break;
        batch.push(value);
        characters += value.length;
      }
      batch.forEach((value) => pending.delete(value));
      if (!batch.length) {
        document.documentElement.lang = language;
        document.documentElement.dir = isRightToLeft(language) ? 'rtl' : 'ltr';
        return;
      }
      busy = true;
      try {
        const response = await fetch('/api/translate', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ target: language, texts: batch }),
        });
        const result = await response.json() as { translations?: string[] };
        if (!response.ok || !Array.isArray(result.translations) || result.translations.length !== batch.length) throw new Error('Translation unavailable');
        if (stopped) return;
        batch.forEach((english, index) => cache.set(english, result.translations![index]));
        saveCache(language, cache);
        failures = 0;
        busy = false;
        schedule();
      } catch {
        if (stopped) return;
        failures += 1;
        busy = false;
        if (failures >= 1) unavailableRef.current();
      }
    };

    const schedule = () => {
      if (stopped || timer) return;
      timer = window.setTimeout(() => { timer = 0; void translate(); }, 70);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: translatedAttributes });
    schedule();

    return () => {
      stopped = true;
      observer.disconnect();
      window.clearTimeout(timer);
      for (const entries of targets.values()) for (const target of entries.values()) {
        if (target.attribute) {
          const element = target.node as Element;
          if (element.getAttribute(target.attribute) === target.rendered) element.setAttribute(target.attribute, target.english);
        } else if ((target.node as Text).nodeValue === target.rendered) (target.node as Text).nodeValue = target.english;
      }
      document.documentElement.lang = originalLang || 'en';
      document.documentElement.dir = originalDir || 'ltr';
    };
  }, [language]);
}
