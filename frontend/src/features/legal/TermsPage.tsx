import { LegalDocument } from './LegalDocument';
import { TERMS_SECTIONS } from './terms.sections';

export function TermsPage() {
  return <LegalDocument titleKey="legal.terms.title" idPrefix="terms" sections={TERMS_SECTIONS} />;
}
