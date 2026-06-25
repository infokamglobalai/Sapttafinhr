import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useIfscLookup } from '@/hooks/useIfscLookup';
import {
  useUpdateCompany, useFiscalYears, useCreateFiscalYear, useCreateBankAccount,
  usePostableAccounts, useCompleteSetup, type Company,
} from '@/features/masters/api';
import { toast } from '@/components/Toaster';
import {
  GSTIN_HINT,
  GSTIN_PLACEHOLDER,
  gstinPanConsistency,
  gstinStateConsistency,
  sanitizeGstinInput,
  sanitizePanInput,
  validateGstin,
  validatePan,
} from '@/lib/taxValidation';
import {
  formatIfscLocation,
  sanitizeAccountNumber,
  sanitizeIfscInput,
  suggestBankLabel,
  validateAccountNumber,
  validateIfscFormat,
} from '@/lib/ifscLookup';

/**
 * Forced first-run setup for the Finance product. Shown by App.tsx until the
 * workspace's company is setup_complete. Walks the admin through the essentials
 * (company profile → fiscal year → optional bank account) and writes each to the
 * real API, then marks setup complete to unlock the product.
 *
 * Signup already seeds Company + COA, so this fills the gaps rather than creating
 * from scratch.
 */
type StepId = 'company' | 'fy' | 'bank' | 'done';
const STEPS: { id: StepId; label: string }[] = [
  { id: 'company', label: 'Company profile' },
  { id: 'fy', label: 'Fiscal year' },
  { id: 'bank', label: 'Bank account' },
  { id: 'done', label: 'Finish' },
];

function fyDefaults() {
  const today = new Date();
  const y = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1; // Apr–Mar
  return {
    name: `FY${String(y).slice(2)}-${String(y + 1).slice(2)}`,
    start_date: `${y}-04-01`,
    end_date: `${y + 1}-03-31`,
  };
}

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const { data: fiscalYears } = useFiscalYears(companyId);
  const { data: accounts } = usePostableAccounts(companyId);

  const updateCompany = useUpdateCompany();
  const createFY = useCreateFiscalYear();
  const createBank = useCreateBankAccount();
  const complete = useCompleteSetup();

  const [step, setStep] = useState<StepId>('company');
  const [err, setErr] = useState<string | null>(null);

  const [cForm, setCForm] = useState<Partial<Company>>({});
  useEffect(() => { if (company) setCForm({ ...company }); }, [company]);

  const [fyForm, setFyForm] = useState(fyDefaults());
  const hasActiveFY = (fiscalYears?.length ?? 0) > 0;

  const [bank, setBank] = useState({ name: '', bank_name: '', account_number: '', ifsc: '', branch: '', opening_balance: '0', ledger_account: '' });
  const ifscLookup = useIfscLookup(bank.ifsc);

  useEffect(() => {
    if (ifscLookup.status !== 'found' || !ifscLookup.details) return;
    const d = ifscLookup.details;
    setBank((prev) => ({
      ...prev,
      bank_name: prev.bank_name || d.bank,
      branch: d.branch_text || prev.branch,
      name: prev.name || suggestBankLabel(d),
    }));
  }, [ifscLookup.status, ifscLookup.details]);

  // Suggest a bank-type GL account (code starting 112x) for the bank step.
  const bankAccountOptions = useMemo(
    () => (accounts ?? []).filter((a) => a.type === 'ASSET'),
    [accounts],
  );

  const idx = STEPS.findIndex((s) => s.id === step);
  const fail = (e: any) => {
    const data = e?.response?.data;
    if (data && typeof data === 'object') {
      const parts = Object.entries(data).flatMap(([k, v]) => {
        if (Array.isArray(v)) return v.map((msg) => `${k}: ${msg}`);
        if (typeof v === 'string') return [`${k}: ${v}`];
        return [];
      });
      if (parts.length) { setErr(parts.join(' ')); return; }
      if (typeof data.detail === 'string') { setErr(data.detail); return; }
    }
    setErr(String(e?.message ?? 'Failed'));
  };

  async function saveCompany() {
    setErr(null);
    if (!companyId) return;
    const isIndia = cForm.base_currency === 'INR' || cForm.country === 'IN';
    const gstin = sanitizeGstinInput(cForm.gstin ?? '');
    const pan = sanitizePanInput(cForm.pan ?? '');
    const stateCode = (cForm.state_code ?? '').trim();

    if (!cForm.legal_name || (isIndia && (!gstin || !stateCode))) {
      setErr(isIndia ? 'Legal name, GSTIN and home state code are required.' : 'Legal name is required.');
      return;
    }
    if (isIndia) {
      const gstErr = validateGstin(gstin, true);
      if (gstErr) { setErr(gstErr); return; }
      const panErr = validatePan(pan);
      if (panErr) { setErr(panErr); return; }
      const stateErr = gstinStateConsistency(gstin, stateCode);
      if (stateErr) { setErr(stateErr); return; }
      const panMatchErr = gstinPanConsistency(gstin, pan);
      if (panMatchErr) { setErr(panMatchErr); return; }
    }
    try {
      await updateCompany.mutateAsync({
        ...cForm,
        id: companyId,
        gstin,
        pan: pan || cForm.pan,
        state_code: stateCode.padStart(2, '0').slice(-2),
      });
      setStep('fy');
    } catch (e) { fail(e); }
  }

  function onGstinChange(raw: string) {
    const gstin = sanitizeGstinInput(raw);
    setCForm((p) => {
      const next: Partial<Company> = { ...p, gstin };
      if (gstin.length >= 2) next.state_code = gstin.slice(0, 2);
      if (gstin.length >= 12) next.pan = gstin.slice(2, 12);
      return next;
    });
  }

  async function saveFY() {
    setErr(null);
    if (hasActiveFY) { setStep('bank'); return; }
    try {
      await createFY.mutateAsync({ company: companyId, ...fyForm, is_active: true });
      setStep('bank');
    } catch (e) { fail(e); }
  }

  async function saveBank(skip: boolean) {
    setErr(null);
    if (!skip) {
      const ifscErr = validateIfscFormat(bank.ifsc, true);
      if (ifscErr) { setErr(ifscErr); return; }
      if (ifscLookup.status === 'loading') {
        setErr('IFSC lookup in progress — wait a moment or check the code.');
        return;
      }
      if (ifscLookup.status === 'error' || ifscLookup.status === 'invalid') {
        setErr(ifscLookup.error ?? 'Enter a valid IFSC before continuing.');
        return;
      }
      if (ifscLookup.status !== 'found') {
        setErr('Enter a valid IFSC to verify the bank branch.');
        return;
      }
      const acErr = validateAccountNumber(bank.account_number);
      if (acErr) { setErr(acErr); return; }
      if (!bank.name || !bank.bank_name || !bank.ledger_account) {
        setErr('Fill the bank fields (or Skip for now).');
        return;
      }
      try {
        await createBank.mutateAsync({
          company: companyId, name: bank.name, bank_name: bank.bank_name,
          account_number: sanitizeAccountNumber(bank.account_number),
          ifsc: sanitizeIfscInput(bank.ifsc), branch: bank.branch,
          opening_balance: bank.opening_balance || '0', ledger_account: Number(bank.ledger_account),
        });
      } catch (e) { fail(e); return; }
    }
    setStep('done');
  }

  async function finish() {
    setErr(null);
    try {
      await complete.mutateAsync();
      toast.success('Setup complete — welcome to fin-saptta!');
      onComplete();
    } catch (e) { fail(e); }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-slate-900">Set up {company?.name ?? 'your company'}</div>
          <p className="text-sm text-slate-500">A few details and your accounting workspace is ready.</p>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= idx ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
              <span className={`text-xs ${i === idx ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-200" />}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 'company' && (
            <div className="space-y-4">
              <Field label="Display Name *"><input className="input" value={cForm.name ?? ''} onChange={(e) => setCForm((p) => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Legal Name *"><input className="input" value={cForm.legal_name ?? ''} onChange={(e) => setCForm((p) => ({ ...p, legal_name: e.target.value }))} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="GSTIN *">
                  <input
                    className="input font-mono"
                    maxLength={15}
                    placeholder={GSTIN_PLACEHOLDER}
                    aria-describedby="gstin-hint"
                    value={cForm.gstin ?? ''}
                    onChange={(e) => onGstinChange(e.target.value)}
                  />
                  <p id="gstin-hint" className="mt-1 text-[11px] leading-snug text-slate-500">{GSTIN_HINT}</p>
                </Field>
                <Field label="PAN">
                  <input
                    className="input font-mono"
                    maxLength={10}
                    placeholder="AAACS1234D"
                    value={cForm.pan ?? ''}
                    onChange={(e) => setCForm((p) => ({ ...p, pan: sanitizePanInput(e.target.value) }))}
                  />
                </Field>
                <Field label="Home State Code *">
                  <input
                    className="input"
                    maxLength={2}
                    placeholder="27"
                    value={cForm.state_code ?? ''}
                    onChange={(e) => setCForm((p) => ({ ...p, state_code: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                  />
                </Field>
                <Field label="Base Currency"><input className="input" maxLength={3} value={cForm.base_currency ?? 'INR'} onChange={(e) => setCForm((p) => ({ ...p, base_currency: e.target.value.toUpperCase() }))} /></Field>
              </div>
              <Nav onNext={saveCompany} nextLabel={updateCompany.isPending ? 'Saving…' : 'Continue'} disabled={updateCompany.isPending} />
            </div>
          )}

          {step === 'fy' && (
            <div className="space-y-4">
              {hasActiveFY ? (
                <p className="text-sm text-slate-600">An active fiscal year already exists (<strong>{fiscalYears?.[0]?.name}</strong>). You can continue.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Name"><input className="input" value={fyForm.name} onChange={(e) => setFyForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                  <Field label="Start date"><input type="date" className="input" value={fyForm.start_date} onChange={(e) => setFyForm((p) => ({ ...p, start_date: e.target.value }))} /></Field>
                  <Field label="End date"><input type="date" className="input" value={fyForm.end_date} onChange={(e) => setFyForm((p) => ({ ...p, end_date: e.target.value }))} /></Field>
                </div>
              )}
              <Nav onBack={() => setStep('company')} onNext={saveFY} nextLabel={createFY.isPending ? 'Saving…' : 'Continue'} disabled={createFY.isPending} />
            </div>
          )}

          {step === 'bank' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Add a bank account now, or skip and add it later. Enter IFSC first — bank and branch details are filled automatically.</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="IFSC *">
                  <div className="relative">
                    <input
                      className={`input font-mono pr-9 ${ifscLookup.status === 'invalid' || ifscLookup.status === 'error' ? 'border-red-300 focus:border-red-400' : ifscLookup.status === 'found' ? 'border-emerald-300' : ''}`}
                      maxLength={11}
                      placeholder="HDFC0001234"
                      value={bank.ifsc}
                      onChange={(e) => setBank((p) => ({ ...p, ifsc: sanitizeIfscInput(e.target.value) }))}
                    />
                    {ifscLookup.status === 'loading' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>
                    )}
                    {ifscLookup.status === 'found' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" aria-hidden>✓</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">11 characters — 4 letters, 0, then 6 alphanumeric (e.g. HDFC0001234).</p>
                  {(ifscLookup.status === 'invalid' || ifscLookup.status === 'error') && ifscLookup.error && (
                    <p className="mt-1 text-[11px] text-red-600">{ifscLookup.error}</p>
                  )}
                </Field>
                <Field label="Bank name *">
                  <input
                    className="input"
                    placeholder="Filled from IFSC"
                    value={bank.bank_name}
                    onChange={(e) => setBank((p) => ({ ...p, bank_name: e.target.value }))}
                  />
                </Field>
                {ifscLookup.details && (
                  <div className="md:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
                    <div className="font-medium">{ifscLookup.details.bank}</div>
                    <div className="mt-0.5 text-emerald-800">{formatIfscLocation(ifscLookup.details)}</div>
                    {ifscLookup.details.address && (
                      <div className="mt-1 text-emerald-700/90">{ifscLookup.details.address}</div>
                    )}
                  </div>
                )}
                <Field label="Account number *">
                  <input
                    className="input font-mono"
                    inputMode="numeric"
                    placeholder="9–18 digits"
                    value={bank.account_number}
                    onChange={(e) => setBank((p) => ({ ...p, account_number: sanitizeAccountNumber(e.target.value) }))}
                  />
                </Field>
                <Field label="Label">
                  <input className="input" placeholder="HDFC Current" value={bank.name} onChange={(e) => setBank((p) => ({ ...p, name: e.target.value }))} />
                </Field>
                <Field label="Opening balance"><input className="input" value={bank.opening_balance} onChange={(e) => setBank((p) => ({ ...p, opening_balance: e.target.value }))} /></Field>
                <Field label="GL account">
                  <div className="flex flex-col gap-2 w-full">
                    {(!accounts || bankAccountOptions.length === 0) ? (
                      <div className="flex flex-col gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-1">
                        <div className="text-sm text-amber-800 font-medium">
                          <strong>Missing Accounts:</strong> You must initialize standard ledgers first.
                        </div>
                        <button 
                          type="button"
                          className="btn-primary w-full bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
                          onClick={() => {
                            if (!companyId) return;
                            api.post(`/masters/accounts/seed_defaults/`, { company: companyId })
                              .then(() => window.location.reload());
                          }}
                        >
                          Initialize Default Accounts Now
                        </button>
                      </div>
                    ) : (
                      <select className="input w-full" value={bank.ledger_account} onChange={(e) => setBank((p) => ({ ...p, ledger_account: e.target.value }))}>
                        <option value="">Select…</option>
                        {bankAccountOptions.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                    )}
                  </div>
                </Field>
              </div>
              <div className="flex items-center justify-between">
                <button className="text-sm text-slate-500 hover:underline" onClick={() => setStep('fy')}>← Back</button>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => saveBank(true)}>Skip for now</button>
                  <button className="btn-primary" onClick={() => saveBank(false)} disabled={createBank.isPending}>{createBank.isPending ? 'Saving…' : 'Add & continue'}</button>
                </div>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center">
              <div className="text-lg font-semibold text-slate-900">You're all set 🎉</div>
              <p className="text-sm text-slate-600">Your company profile and fiscal year are configured. Finish to start invoicing.</p>
              <div className="flex justify-center gap-2">
                <button className="btn-ghost" onClick={() => setStep('bank')}>← Back</button>
                <button className="btn-primary" onClick={finish} disabled={complete.isPending}>{complete.isPending ? 'Finishing…' : 'Enter fin-saptta'}</button>
              </div>
            </div>
          )}

          {err && <div className="mt-4 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function Nav({ onBack, onNext, nextLabel, disabled }: { onBack?: () => void; onNext: () => void; nextLabel: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? <button className="text-sm text-slate-500 hover:underline" onClick={onBack}>← Back</button> : <span />}
      <button className="btn-primary" onClick={onNext} disabled={disabled}>{nextLabel}</button>
    </div>
  );
}
