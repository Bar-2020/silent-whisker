import { useTranslation } from 'react-i18next';
import { FormButton } from '@shared/components/form-button/FormButton';
import { FormButtonVariant } from '@shared/components/form-button/FormButton.types';

/** The quiet Cancel beside a form's or a dialog's main button (DESIGN.md, Buttons). */
export function CancelButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <FormButton type="button" variant={FormButtonVariant.Quiet} pending={false} onClick={onClick}>
      {t('common.cancel')}
    </FormButton>
  );
}
