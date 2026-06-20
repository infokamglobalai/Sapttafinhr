import { useEffect, useMemo, useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import {
  useUpdateCompany, useFiscalYears, useCreateFiscalYear, useCreateBankAccount,
  usePostableAccounts, useCompleteSetup, type Company,
} from '@/features/masters/api';
import { toast } from '@/components/Toaster';

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

  useEffect(() => {
    if (bank.ifsc.length === 11) {
      fetch(`https://ifsc.razorpay.com/${bank.ifsc}`)
        .then((res) => {
          if (!res.ok) throw new Error('Invalid IFSC');
          return res.json();
        })
        .then((data) => {
          if (data && data.BRANCH) {
            setBank((prev) => ({
              ...prev,
              branch: data.BRANCH,
              bank_name: prev.bank_name || data.BANK,
            }));
            toast.success('IFSC verified', `${data.BANK}, ${data.BRANCH}`);
          }
        })
        .catch(() => {
          toast.error('Could not verify IFSC', 'Please check the code or enter branch manually.');
        });
    }
  }, [bank.ifsc]);

  // Suggest a bank-type GL account (code starting 112x) for the bank step.
  const bankAccountOptions = useMemo(
    () => (accounts ?? []).filter((a) => a.type === 'ASSET'),
    [accounts],
  );

  const idx = STEPS.findIndex((s) => s.id === step);
  const fail = (e: any) => setErr(JSON.stringify(e?.response?.data ?? e?.message ?? 'Failed'));

  async function saveCompany() {
    setErr(null);
    if (!companyId) return;
    if (!cForm.legal_name || !cForm.gstin || !cForm.state_code) {
      setErr('Legal name, GSTIN and home state code are required.');
      return;
    }
    try {
      await updateCompany.mutateAsync({ ...cForm, id: companyId });
      setStep('fy');
    } catch (e) { fail(e); }
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
      if (!bank.name || !bank.bank_name || !bank.account_number || !bank.ledger_account) {
        setErr('Fill the bank fields (or Skip for now).');
        return;
      }
      try {
        await createBank.mutateAsync({
          company: companyId, name: bank.name, bank_name: bank.bank_name,
          account_number: bank.account_number, ifsc: bank.ifsc, branch: bank.branch,
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
                <Field label="GSTIN *"><input className="input font-mono" maxLength={15} value={cForm.gstin ?? ''} onChange={(e) => setCForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))} /></Field>
                <Field label="PAN"><input className="input font-mono" maxLength={10} value={cForm.pan ?? ''} onChange={(e) => setCForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))} /></Field>
                <Field label="Home State Code *"><input className="input" maxLength={2} placeholder="27" value={cForm.state_code ?? ''} onChange={(e) => setCForm((p) => ({ ...p, state_code: e.target.value }))} /></Field>
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
              <p className="text-sm text-slate-500">Add a bank account now, or skip and add it later.</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Label"><input className="input" placeholder="HDFC Current" value={bank.name} onChange={(e) => setBank((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label="Bank name"><input className="input" value={bank.bank_name} onChange={(e) => setBank((p) => ({ ...p, bank_name: e.target.value }))} /></Field>
                <Field label="Account number"><input className="input font-mono" value={bank.account_number} onChange={(e) => setBank((p) => ({ ...p, account_number: e.target.value }))} /></Field>
                <Field label="IFSC"><input className="input font-mono" value={bank.ifsc} onChange={(e) => setBank((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))} /></Field>
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
                            fetch(`/api/v1/masters/accounts/seed_defaults/`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
                              body: JSON.stringify({ company: companyId })
                            }).then(() => window.location.reload());
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
