import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import PageHeader from '@/components/PageHeader';
import { formatINR } from '@/lib/money';

interface TDSSection { code: string; label: string; default_rate: string; }
interface TDSRecord {
  id: number; vendor_bill: number | null; vendor_bill_no: string | null;
  vendor_name: string | null; section: string; rate: string;
  base_amount: string; tds_amount: string; deduction_date: string;
  pan: string; fy: string; quarter: string; challan_no: string;
  deposited_date: string | null; is_deposited: boolean; notes: string;
}
interface TDSSummary {
  total_deducted: string; total_deposited: string; total_pending: string;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const currentFY = () => {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String(y + 1).slice(-2)}`;
};

export default function TDSPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const fy = currentFY();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    section: '194C', rate: '2.00', base_amount: '', tds_amount: '',
    deduction_date: new Date().toISOString().slice(0, 10),
    pan: '', quarter: 'Q1', fy, challan_no: '', notes: '',
    vendor_bill: '',
  });

  const { data: sections = [] } = useQuery<TDSSection[]>({
    queryKey: ['tds-sections'],
    queryFn: () => api.get('/taxation/tds/sections/').then(r => r.data),
  });

  const { data: records = [], isLoading } = useQuery<TDSRecord[]>({
    queryKey: ['tds', companyId, fy],
    enabled: !!companyId,
    queryFn: () => api.get('/taxation/tds/', { params: { company: companyId, fy } }).then(r => r.data),
  });

  const { data: summary } = useQuery<TDSSummary>({
    queryKey: ['tds-summary', companyId, fy],
    enabled: !!companyId,
    queryFn: () => api.get('/taxation/tds/summary/', { params: { company: companyId, fy } }).then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/taxation/tds/', { ...data, company: companyId }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tds'] }); qc.invalidateQueries({ queryKey: ['tds-summary'] }); setShowAdd(false); },
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, challan_no, deposited_date }: any) =>
      api.patch(`/taxation/tds/${id}/`, { is_deposited: true, challan_no, deposited_date }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tds'] }),
  });

  const onSectionChange = (code: string) => {
    const sec = sections.find(s => s.code === code);
    setForm(f => ({
      ...f, section: code,
      rate: sec?.default_rate ?? '0',
      tds_amount: f.base_amount ? String((Number(f.base_amount) * Number(sec?.default_rate ?? 0) / 100).toFixed(2)) : '',
    }));
  };

  const onBaseChange = (val: string) => {
    const tds = val ? String((Number(val) * Number(form.rate) / 100).toFixed(2)) : '';
    setForm(f => ({ ...f, base_amount: val, tds_amount: tds }));
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <PageHeader
        title="TDS Management"
        subtitle={`Tax Deducted at Source — FY ${fy}`}
        action={
          <button onClick={() => setShowAdd(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            + Record TDS Deduction
          </button>
        }
      />

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-xs uppercase tracking-wide text-slate-500">Total Deducted</div>
            <div className="mt-1 text-2xl font-bold">{formatINR(summary.total_deducted)}</div>
          </div>
          <div className="card text-center">
            <div className="text-xs uppercase tracking-wide text-slate-500">Deposited to Govt</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">{formatINR(summary.total_deposited)}</div>
          </div>
          <div className="card text-center">
            <div className="text-xs uppercase tracking-wide text-slate-500">Pending Deposit</div>
            <div className="mt-1 text-2xl font-bold text-amber-600">{formatINR(summary.total_pending)}</div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold">Record TDS Deduction</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">TDS Section</label>
              <select className="input" value={form.section} onChange={e => onSectionChange(e.target.value)}>
                {sections.map(s => <option key={s.code} value={s.code}>{s.code} ({s.default_rate}%)</option>)}
              </select>
            </div>
            <div>
              <label className="label">Base Amount (₹)</label>
              <input className="input" type="number" placeholder="100000" value={form.base_amount} onChange={e => onBaseChange(e.target.value)} />
            </div>
            <div>
              <label className="label">TDS Amount (₹) — auto</label>
              <input className="input" type="number" value={form.tds_amount} onChange={e => setForm(f => ({ ...f, tds_amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Rate (%)</label>
              <input className="input" type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Deduction Date</label>
              <input className="input" type="date" value={form.deduction_date} onChange={e => setForm(f => ({ ...f, deduction_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Quarter</label>
              <select className="input" value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))}>
                {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vendor PAN</label>
              <input className="input" placeholder="ABCDE1234F" maxLength={10} value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="label">Vendor Bill # (optional)</label>
              <input className="input" placeholder="Bill ID" value={form.vendor_bill} onChange={e => setForm(f => ({ ...f, vendor_bill: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending || !form.base_amount}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {addMutation.isPending ? 'Saving…' : 'Save TDS Deduction'}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Records table */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Loading…</div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-sm text-slate-500">No TDS deductions recorded for FY {fy}.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">PAN</th>
                <th className="px-4 py-3">Quarter</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right">TDS</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{r.deduction_date}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{r.section}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.vendor_name ?? '—'}</div>
                    {r.vendor_bill_no && <div className="text-xs text-slate-400">{r.vendor_bill_no}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.pan || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.fy} {r.quarter}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(r.base_amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatINR(r.tds_amount)}</td>
                  <td className="px-4 py-3">
                    {r.is_deposited ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Deposited {r.deposited_date}
                      </span>
                    ) : (
                      <button onClick={() => {
                        const challan = prompt('Challan number:');
                        const dep_date = prompt('Deposit date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
                        if (challan && dep_date) depositMutation.mutate({ id: r.id, challan_no: challan, deposited_date: dep_date });
                      }} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-200 cursor-pointer">
                        Pending — Mark Deposited
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
