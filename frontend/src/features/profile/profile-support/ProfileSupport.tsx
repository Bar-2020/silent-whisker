import { useTranslation } from 'react-i18next';
import { CONTACT_EMAIL, SOURCE_CODE_URL } from '@constants/contact';
import { PRIVACY_PATH, TERMS_PATH } from '@constants/routes';
import { CodeIcon } from '@shared/components/icon/CodeIcon';
import { CommentIcon } from '@shared/components/icon/CommentIcon';
import { InfoIcon } from '@shared/components/icon/InfoIcon';
import { ShieldIcon } from '@shared/components/icon/ShieldIcon';
import { ProfileRow } from '../profile-row/ProfileRow';
import { ProfileRowTone } from '../profile-row/ProfileRow.types';
import { ProfileSection } from '../profile-section/ProfileSection';

/** The way to reach us and the public pages: contact, source code, terms and privacy (D-74). */
export function ProfileSupport() {
  const { t } = useTranslation();

  return (
    <ProfileSection title={t('profile.support.title')}>
      <ProfileRow
        icon={<CommentIcon />}
        title={t('common.contact')}
        hint={<span dir="ltr">{CONTACT_EMAIL}</span>}
        href={`mailto:${CONTACT_EMAIL}`}
        tone={ProfileRowTone.Normal}
      />
      <ProfileRow
        icon={<CodeIcon />}
        title={t('landing.source')}
        href={SOURCE_CODE_URL}
        opensNewTab
        tone={ProfileRowTone.Normal}
      />
      <ProfileRow
        icon={<InfoIcon />}
        title={t('legal.terms.title')}
        to={TERMS_PATH}
        opensPage
        tone={ProfileRowTone.Normal}
      />
      <ProfileRow
        icon={<ShieldIcon />}
        title={t('legal.privacy.title')}
        to={PRIVACY_PATH}
        opensPage
        tone={ProfileRowTone.Normal}
      />
    </ProfileSection>
  );
}
