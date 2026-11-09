const HI_DIGITS = (n) => String(n).replace(/\d/g, (d) => '०१२३४५६७८९'[d]);
export const hiNum = (n) => new Intl.NumberFormat('hi-IN').format(n);

export const timeAgo = (date) => {
  if (!date) return '';
  const s = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  const units = [['साल', 31536000], ['महीने', 2592000], ['दिन', 86400], ['घंटे', 3600], ['मिनट', 60]];
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return `${n} ${name === 'महीने' && n === 1 ? 'महीना' : name} पहले`;
  }
  return 'अभी-अभी';
};

export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('hi-IN', opts) : '';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('hi-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export const compact = (n = 0) => new Intl.NumberFormat('hi-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const initials = (name = '') => name.trim().split(/\s+/).map((p) => Array.from(p)[0]).slice(0, 2).join('').toUpperCase();

// Hindi name first, English as fallback.
export const catName = (c) => (c && (c.nameHi || c.name)) || '';
export const readTime = (n) => `${n} मिनट में पढ़ें`;
export { HI_DIGITS };
