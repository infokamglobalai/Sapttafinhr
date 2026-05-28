import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { type DownloadOpts, downloadPDF, downloadCSV } from './download';

interface Props {
  opts: DownloadOpts | null;
}

export default function DownloadMenu({ opts }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!opts) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <Download size={15} /> Download
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => { downloadPDF(opts); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileText size={15} className="text-red-500" /> Export as PDF
          </button>
          <button
            onClick={() => { downloadCSV(opts); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" /> Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}
