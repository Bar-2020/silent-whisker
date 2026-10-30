import type { ParseKeys } from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { CONTACT_EMAIL } from '@constants/contact';
import type { LegalBlock, LegalSection } from './legal.types';
import styles from './LegalDocument.module.css';

// The address is a constant (D-74); a text writes it as <mail>{{email}}</mail>.
const MAIL_LINK = <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" />;

function Text({ textKey }: { textKey: ParseKeys }) {
  return (
    <Trans i18nKey={textKey} values={{ email: CONTACT_EMAIL }} components={{ mail: MAIL_LINK }} />
  );
}

function Block({ block }: { block: LegalBlock }) {
  if ('list' in block) {
    return (
      <ul className={styles.list}>
        {block.list.map((key) => (
          <li key={key}>
            <Text textKey={key} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p>
      <Text textKey={block.paragraph} />
    </p>
  );
}

/** A long reading page: the contents list beside it on a desktop, hidden on a phone. */
export function LegalDocument({
  titleKey,
  idPrefix,
  sections,
}: {
  titleKey: ParseKeys;
  idPrefix: string;
  sections: LegalSection[];
}) {
  const { t } = useTranslation();
  const title = t(titleKey);
  const idOf = (index: number) => `${idPrefix}-${index + 1}`;

  return (
    <div className={styles.wrap}>
      <title>{`${title} | ${t('app.name')}`}</title>
      <nav className={styles.toc} aria-label={t('legal.toc')}>
        <ol>
          {sections.map(({ heading }, index) => (
            <li key={heading}>
              <a href={`#${idOf(index)}`}>{t(heading)}</a>
            </li>
          ))}
        </ol>
      </nav>
      <article className={styles.read}>
        <h1 className={styles.title}>{title}</h1>
        {sections.map(({ heading, blocks }, index) => (
          <section key={heading} className={styles.section} aria-labelledby={idOf(index)}>
            <h2 id={idOf(index)}>{t(heading)}</h2>
            {blocks.map((block) => (
              <Block key={'list' in block ? block.list[0] : block.paragraph} block={block} />
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
