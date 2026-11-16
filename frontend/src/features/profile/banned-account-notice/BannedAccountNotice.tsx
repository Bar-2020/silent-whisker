import { useTranslation } from 'react-i18next';
import { RestrictIcon } from '@shared/components/icon/RestrictIcon';
import { InfoNotice } from '../info-notice/InfoNotice';
import { InfoNoticeTone } from '../info-notice/InfoNotice.types';

/** Shown for as long as the member is banned: reading works, every write is refused (R-08, D-72). */
export function BannedAccountNotice() {
  const { t } = useTranslation();

  return (
    <InfoNotice
      icon={<RestrictIcon />}
      tone={InfoNoticeTone.Bad}
      title={t('common.banned.title')}
      text={t('common.banned.text')}
    />
  );
}
