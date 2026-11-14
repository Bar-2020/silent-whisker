import type { LegalSection } from './legal.types';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: 'legal.privacy.s1.h',
    blocks: [{ paragraph: 'legal.privacy.s1.p' }],
  },
  {
    heading: 'legal.privacy.s2.h',
    blocks: [
      { paragraph: 'legal.privacy.s2.p' },
      { list: ['legal.privacy.s2.l1', 'legal.privacy.s2.l2', 'legal.privacy.s2.l3'] },
      { paragraph: 'legal.privacy.s2.p2' },
    ],
  },
  {
    heading: 'legal.privacy.s3.h',
    blocks: [{ paragraph: 'legal.privacy.s3.p' }],
  },
  {
    heading: 'legal.privacy.s4.h',
    blocks: [{ paragraph: 'legal.privacy.s4.p' }],
  },
  {
    heading: 'legal.privacy.s5.h',
    blocks: [{ paragraph: 'legal.privacy.s5.p' }],
  },
  {
    heading: 'legal.privacy.s6.h',
    blocks: [{ paragraph: 'legal.privacy.s6.p' }],
  },
  {
    heading: 'legal.privacy.s7.h',
    blocks: [{ paragraph: 'legal.privacy.s7.p' }],
  },
  {
    heading: 'legal.privacy.s8.h',
    blocks: [{ paragraph: 'legal.privacy.s8.p' }],
  },
];
