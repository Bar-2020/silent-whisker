import { LegalDocument } from './LegalDocument';
import { PRIVACY_SECTIONS } from './privacy.sections';

export function PrivacyPage() {
  return <LegalDocument titleKey="legal.privacy.title" sections={PRIVACY_SECTIONS} />;
}
