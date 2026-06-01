import LegalPageLayout from '../components/legal/LegalPageLayout';
import { LEGAL_LAST_UPDATED, privacySections } from '../data/legal-pages-data';

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Privacy"
      titleHighlight="Policy"
      subtitle="How Saptta collects, uses, and protects personal information on our website and cloud platform."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={privacySections}
    />
  );
}
