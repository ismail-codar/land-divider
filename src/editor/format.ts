const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Area in m². */
export const fA = (a: number) => nf0.format(Math.round(a)) + ' m²';
/** Area in dönüm (1000 m²). */
export const fDn = (a: number) => nf2.format(a / 1000) + ' dönüm';
/** Signed area delta in m². */
export const fD = (d: number) => {
  const r = Math.round(d);
  return (r > 0 ? '+' : r < 0 ? '−' : '±') + nf0.format(Math.abs(r)) + ' m²';
};
/** Length in metres. */
export const fL = (l: number) => nf1.format(l) + ' m';

export function initials(n: string) {
  return n ? n.split(' ').map((w) => w[0]).join('').slice(0, 2).toLocaleUpperCase('tr-TR') : '';
}
