import LegalPageLayout from '../components/legal/LegalPageLayout';
import { LEGAL_LAST_UPDATED, termsSections } from '../data/legal-pages-data';

export default function TermsOfService() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Terms of"
      titleHighlight="Service"
      subtitle="Rules for using the Saptta website, applications, and subscription services."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={termsSections}
    />
  );
}
