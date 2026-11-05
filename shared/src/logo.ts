import { BRAND } from './brand';

export type LogoVariant = 'color' | 'reversed';

/** Inner markup of the logo mark, for an <svg viewBox="0 0 100 100">. */
export function logoMarkShapes(variant: LogoVariant) {
  const ink = variant === 'reversed' ? BRAND.cream : BRAND.navy;
  const accent = BRAND.orange;

  return `
    <path d="M 58,8 H 20 Q 8,8 8,20 V 80 Q 8,92 20,92 H 80 Q 92,92 92,80 V 46" stroke="${ink}" stroke-width="7" fill="none"/>
    <polygon points="86,46 98,46 92,37" fill="${accent}"/>
    <polyline points="76,32 85,10 94,32" stroke="${accent}" stroke-width="6" stroke-linejoin="miter" stroke-miterlimit="10" fill="none"/>
    <polyline points="28,78 50,28 72,78" stroke="${ink}" stroke-width="9" stroke-linejoin="miter" stroke-miterlimit="10" fill="none"/>
    <line x1="34" y1="64" x2="66" y2="64" stroke="${ink}" stroke-width="7"/>
  `;
}
