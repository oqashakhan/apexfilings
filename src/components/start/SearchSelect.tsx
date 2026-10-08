import { useState } from 'react';
import { Check, Search } from 'lucide-react';

export function SearchSelect({ id, label, options, value, onChange, onBlur, inputRef, error }: {
  id: string; label: string; options: readonly { code: string; name: string }[]; value: string;
  onChange: (value: string) => void; onBlur: () => void; inputRef: (element: HTMLInputElement | null) => void; error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const selected = options.find(option => option.code === value);
  const filtered = options.filter(option => `${option.name} ${option.code}`.toLowerCase().includes(query.toLowerCase()));
  const choose = (code: string) => { onChange(code); setOpen(false); setQuery(''); };
  return <div className="wizard-select" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setQuery(''); onBlur(); } }}>
    <label htmlFor={id}>{label}</label>
    <div className="wizard-select-input"><Search size={18} aria-hidden="true" />
      <input ref={inputRef} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && filtered[active] ? `${id}-${filtered[active].code}` : undefined} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} autoComplete="off" placeholder={`Search ${label.toLowerCase()}`} value={open ? query : selected?.name ?? ''}
        onFocus={() => { setOpen(true); setQuery(''); setActive(0); }}
        onClick={() => { if (!open) { setOpen(true); setQuery(''); setActive(0); } }}
        onChange={event => { setOpen(true); setQuery(event.target.value); setActive(0); onChange(''); }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); const next = Math.max(0, Math.min(filtered.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))); setActive(next); document.getElementById(`${id}-${filtered[next]?.code}`)?.scrollIntoView({ block: 'nearest' }); }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (filtered[active]) choose(filtered[active].code); }
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setQuery(''); }
        }} />
    </div>
    {open && <ul id={`${id}-list`} role="listbox" aria-label={label} className="wizard-select-options">
      {filtered.map((option, index) => <li key={option.code} id={`${id}-${option.code}`} role="option" aria-selected={value === option.code} data-active={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(option.code)}><span>{option.name}</span>{value === option.code && <Check size={16} aria-hidden="true" />}</li>)}
      {!filtered.length && <li role="presentation">No matches. Try another search.</li>}
    </ul>}
    {error && <p id={`${id}-error`} className="wizard-error" role="alert">{error}</p>}
  </div>;
}
