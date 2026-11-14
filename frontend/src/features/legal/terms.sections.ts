import type { LegalSection } from './legal.types';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: 'legal.terms.s1.h',
    blocks: [{ paragraph: 'legal.terms.s1.p' }],
  },
  {
    heading: 'legal.terms.s2.h',
    blocks: [{ paragraph: 'legal.terms.s2.p' }],
  },
  {
    heading: 'legal.terms.s3.h',
    blocks: [
      { paragraph: 'legal.terms.s3.p' },
      { list: ['legal.terms.s3.l1', 'legal.terms.s3.l2', 'legal.terms.s3.l3'] },
      { paragraph: 'legal.terms.s3.p2' },
    ],
  },
  {
    heading: 'legal.terms.s4.h',
    blocks: [{ paragraph: 'legal.terms.s4.p' }],
  },
  {
    heading: 'legal.terms.s5.h',
    blocks: [{ paragraph: 'legal.terms.s5.p' }],
  },
  {
    heading: 'legal.terms.s6.h',
    blocks: [{ paragraph: 'legal.terms.s6.p' }],
  },
  {
    heading: 'legal.terms.s7.h',
    blocks: [{ paragraph: 'legal.terms.s7.p' }],
  },
];
