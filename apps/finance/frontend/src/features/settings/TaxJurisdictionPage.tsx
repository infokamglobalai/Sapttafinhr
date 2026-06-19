import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useJurisdictions, useUpdateCompany, type Jurisdiction, type TaxRegime } from '@/features/masters/api';

const REGIME_LABEL: Record<TaxRegime, string> = {
  INDIA_GST: 'India — GST',
  GCC_VAT: 'GCC — VAT',
  NONE: 'No indirect tax',
};

const EINVOICE_LABEL: Record<string, string> = {
  NONE: 'Not required',
  NIC_IRP: 'India — IRN / QR (NIC IRP)',
  ZATCA: 'Saudi Arabia — ZATCA Fatoora',
  PEPPOL_PINT_AE: 'UAE — Peppol PINT AE',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function TaxJurisdictionPage() {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const { data: jurisdictions } = useJurisdictions();
  const update = useUpdateCompany();

  const [country, setCountry] = useState('IN');
  const [taxId, setTaxId] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setCountry(company.country ?? 'IN');
      setTaxId(company.tax_id ?? '');
    }
  }, [company]);

  const selected = useMemo<Jurisdiction | undefined>(
    () => jurisdictions?.find((j) => j.country === country),
    [jurisdictions, country],
  );

  const vatDisplay = useMemo(() => {
    if (!selected) return '—';
    if (selected.tax_regime === 'GCC_VAT') return `${selected.standard_vat_rate}%`;
    if (selected.tax_regime === 'INDIA_GST') return 'GST slabs (per item)';
    return '—';
  }, [selected]);

  const save = async () => {
    setErr(null);
    if (!companyId || !selected) return;
    try {
      await update.mutateAsync({
        id: companyId,
        country: selected.country,
        tax_regime: selected.tax_regime,
        standard_vat_rate: selected.standard_vat_rate,
        base_currency: selected.currency,
        tax_id: taxId,
      });
      toast.success(`Jurisdiction set to ${selected.name}`);
    } catch (e: any) {
      setErr(JSON.stringify(e?.response?.data ?? 'Failed'));
    }
  };

  if (!company) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Region / Tax Jurisdiction"
        subtitle="Choose the country your books run under — Saptta applies that country's tax rules."
      />

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">Country / Jurisdiction</label>
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {(jurisdictions ?? []).map((j) => (
                <option key={j.country} value={j.country}>{j.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{selected?.tax_id_label ?? 'Tax ID'}</label>
            <input
              className="input font-mono"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value.toUpperCase())}
              placeholder={selected?.tax_id_label === 'TRN' ? '15-digit TRN' : ''}
            />
          </div>
        </div>

        {selected && (
          <div className="rounded-lg border border-ink-150 bg-ink-50/50 p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-600">
              {selected.name} — applied rules
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
              <Rule label="Tax regime" value={REGIME_LABEL[selected.tax_regime]} />
              <Rule label="Standard VAT" value={vatDisplay} />
              <Rule label="Currency" value={selected.currency} />
              <Rule label="Tax ID type" value={selected.tax_id_label} />
              <Rule label="E-invoicing" value={EINVOICE_LABEL[selected.einvoice_scheme] ?? selected.einvoice_scheme} />
              <Rule label="Fiscal year starts" value={MONTHS[selected.fiscal_year_start_month - 1]} />
            </dl>
          </div>
        )}

        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save} disabled={update.isPending || !selected}>
            {update.isPending ? 'Saving…' : 'Save jurisdiction'}
          </button>
        </div>
      </div>

      <div className="card bg-slate-50 text-sm text-slate-600">
        <strong>Heads up:</strong>
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>Changing the jurisdiction sets the tax regime, default currency and tax-ID type used across the app.</li>
          <li>VAT calculation, bilingual invoices and e-invoicing arrive in later phases of the GCC rollout.</li>
          <li>Rates shown are current as of June 2026 — verify with the local tax authority before filing.</li>
        </ul>
      </div>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
