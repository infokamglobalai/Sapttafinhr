import { useEffect, useState } from 'react';
import { useCompanies, useFiscalYears } from '@/features/masters/api';

export function useActiveCompany() {
  const { data: companies } = useCompanies();
  const [companyId, setCompanyId] = useState<number | undefined>();
  useEffect(() => {
    if (companyId == null && companies?.length) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  const { data: fiscalYears } = useFiscalYears(companyId);
  const [fyId, setFyId] = useState<number | undefined>();
  useEffect(() => {
    if (fyId == null && fiscalYears?.length) setFyId(fiscalYears[0].id);
  }, [fiscalYears, fyId]);

  return { companyId, setCompanyId, fyId, setFyId, companies, fiscalYears };
}
