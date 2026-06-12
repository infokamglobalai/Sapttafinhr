import { AlertCircle } from 'lucide-react';
import { useActiveCompany } from '@/hooks/useActiveCompany';

interface Props { onGo: (route: string) => void; }

export default function ProfileBanner({ onGo }: Props) {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  if (!company) return null;

  const missing: string[] = [];
  if (!company.gstin) missing.push('GSTIN');
  if (!company.state_code) missing.push('State code');
  if (!company.legal_name) missing.push('Legal name');
  if (!company.pan) missing.push('PAN');

  if (missing.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <div className="flex-1">
        <div className="font-semibold text-amber-900">Complete your company profile</div>
        <div className="mt-0.5 text-xs text-amber-800">
          Missing: <strong>{missing.join(', ')}</strong>. These appear on invoices and drive GST calculations.
        </div>
      </div>
      <button onClick={() => onGo('company-profile')} className="shrink-0 rounded-md bg-black px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800">
        Complete now
      </button>
    </div>
  );
}
