import { LegalDocument } from '../legal-document/LegalDocument';
import { PRIVACY_SECTIONS } from '../privacy.sections';

export function PrivacyPage() {
  return (
    <LegalDocument titleKey="legal.privacy.title" idPrefix="privacy" sections={PRIVACY_SECTIONS} />
  );
}
