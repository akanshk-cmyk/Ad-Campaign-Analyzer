import { useMemo, useRef, useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAskCampaignAssistant } from '@workspace/api-client-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  BarChart3, CalendarDays, Check, ChevronDown, CircleHelp, Download,
  FileSpreadsheet, FileText, FilterX, Lightbulb, LoaderCircle, Moon, Printer, Search, Sun,
  UploadCloud, X,
} from 'lucide-react';

type Campaign = {
  date: string; campaign_name: string; channel: Channel; audience: string; campaign_goal: string;
  spend: number; clicks: number; conversions: number; attributed_revenue: number | null; impressions?: number;
};
type Channel = 'Facebook' | 'Instagram' | 'Pinterest' | 'Twitter/X';
type ViewName = 'Overview' | 'Platform Comparison' | 'Campaign Details' | 'Time Series';
type Filters = { startDate: string; endDate: string; channels: string[]; audiences: string[]; goals: string[] };
type Metric = { spend: number; clicks: number; conversions: number; attributedRevenue: number | null; cpa: number | null; roi: number | null; roas: number | null; rowCount: number };

const required = ['date', 'campaign_name', 'channel', 'audience', 'campaign_goal', 'spend', 'clicks', 'conversions'];
const channels: Channel[] = ['Facebook', 'Instagram', 'Pinterest', 'Twitter/X'];
const channelColors: Record<Channel, string> = {
  Facebook: '#4267a9', Instagram: '#b45e74', Pinterest: '#bd4c4c', 'Twitter/X': '#4d8582',
};
const chartColors = ['#c45d3b', '#448775', '#617da2', '#d7a94a'];
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const compactMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
const number = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
const ratio = (n: number | null, suffix = '') => n === null || !Number.isFinite(n) ? 'Unavailable' : `${n.toFixed(2)}${suffix}`;
const prettyDate = (value: string, year = false) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', year ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
};
function aggregate(rows: Campaign[]): Metric {
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const conversions = rows.reduce((s, r) => s + r.conversions, 0);
  const hasRevenue = rows.length > 0 && rows.every(r => r.attributed_revenue !== null);
  const attributedRevenue = hasRevenue ? rows.reduce((s, r) => s + (r.attributed_revenue ?? 0), 0) : null;
  return { spend, clicks, conversions, attributedRevenue, cpa: conversions ? spend / conversions : null,
    roi: spend && attributedRevenue !== null ? (attributedRevenue - spend) / spend : null,
    roas: spend && attributedRevenue !== null ? attributedRevenue / spend : null, rowCount: rows.length };
}
function downloadFile(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function csv(rows: Record<string, unknown>[]) {
  return Papa.unparse(rows);
}
function templateRows() {
  return [{ date: '2025-04-01', campaign_name: 'Spring launch — prospecting', channel: 'Facebook', audience: 'New customers', campaign_goal: 'Conversions', spend: 1250, clicks: 980, conversions: 46, attributed_revenue: 4380, impressions: 24700 }];
}
function downloadCsvTemplate() {
  downloadFile('campaign-template.csv', csv(templateRows()), 'text/csv;charset=utf-8');
}
function downloadXlsxTemplate() {
  const sheet = XLSX.utils.json_to_sheet(templateRows());
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Campaigns');
  XLSX.writeFile(book, 'campaign-template.xlsx');
}
function canonicalChannel(value: unknown): Channel | null {
  const v = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (['facebook', 'fb', 'meta/facebook'].includes(v)) return 'Facebook';
  if (['instagram', 'ig'].includes(v)) return 'Instagram';
  if (['pinterest', 'pin'].includes(v)) return 'Pinterest';
  if (['twitter/x', 'twitter', 'x', 'twitterx', 'x.com'].includes(v)) return 'Twitter/X';
  return null;
}
function normalizeHeaders(row: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => { mapped[key.trim().toLowerCase()] = value; });
  return mapped;
}
function validateRows(input: Record<string, unknown>[], hasRevenueColumn: boolean) {
  const issues: string[] = [];
  if (input.length > 500) return { rows: [] as Campaign[], issues: ['This file has more than 500 data rows. Split it into smaller files and upload again.'] };
  if (!input.length) return { rows: [] as Campaign[], issues: ['No campaign rows found. Add data below the header row and try again.'] };
  const rows = input.map((raw, idx) => {
    const rowNum = idx + 2; const row = normalizeHeaders(raw);
    required.forEach((field) => {
      if (row[field] === undefined || String(row[field]).trim() === '') issues.push(`Row ${rowNum}: missing required value “${field}”.`);
    });
    if (row.currency !== undefined && String(row.currency).trim() && String(row.currency).trim().toUpperCase() !== 'USD') {
      issues.push(`Row ${rowNum}: currency must be USD; found “${String(row.currency)}”.`);
    }
    const date = String(row.date ?? '').trim();
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
      issues.push(`Row ${rowNum}: date must be a real date in YYYY-MM-DD format.`);
    }
    const channel = canonicalChannel(row.channel);
    if (row.channel !== undefined && !channel) issues.push(`Row ${rowNum}: unsupported channel “${String(row.channel)}”. Use Facebook, Instagram, Pinterest, or Twitter/X.`);
    const numericFields = ['spend', 'clicks', 'conversions', ...(hasRevenueColumn ? ['attributed_revenue'] : []), ...(row.impressions !== undefined && String(row.impressions).trim() ? ['impressions'] : [])];
    numericFields.forEach((field) => {
      const raw = row[field];
      const value = Number(String(raw ?? '').replace(/[$,]/g, '').trim());
      if (raw === undefined || String(raw).trim() === '' || !Number.isFinite(value) || value < 0) {
        issues.push(`Row ${rowNum}: “${field}” must be a finite, non-negative number${field === 'attributed_revenue' ? ' in USD' : ''}.`);
      }
    });
    const n = (key: string) => Number(String(row[key] ?? 0).replace(/[$,]/g, '').trim());
    return {
      date, campaign_name: String(row.campaign_name ?? '').trim(), channel: channel ?? 'Facebook',
      audience: String(row.audience ?? '').trim(), campaign_goal: String(row.campaign_goal ?? '').trim(),
      spend: n('spend'), clicks: n('clicks'), conversions: n('conversions'),
      attributed_revenue: hasRevenueColumn ? n('attributed_revenue') : null,
      ...(row.impressions !== undefined && String(row.impressions).trim() ? { impressions: n('impressions') } : {}),
    } as Campaign;
  });
  return { rows: issues.length ? [] : rows, issues };
}
async function parseCampaignFile(file: File): Promise<{ rows: Campaign[]; revenueAvailable: boolean }> {
  if (file.size > 10 * 1024 * 1024) throw new Error('This file is larger than 10 MB. Export a smaller date range and upload again.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'csv' && ext !== 'xlsx') throw new Error('Unsupported file type. Choose a CSV or .xlsx workbook.');
  let rawRows: Record<string, unknown>[] = [];
  let hasRevenueColumn = false;
  if (ext === 'csv') {
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase() });
    if (result.errors.length) throw new Error(`CSV could not be read: ${result.errors[0].message}`);
    const headers = (result.meta.fields ?? []).map(h => h.trim().toLowerCase());
    hasRevenueColumn = headers.includes('attributed_revenue');
    const missing = required.filter(f => !headers.includes(f));
    if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Download a template to check the expected headers.`);
    rawRows = result.data;
  } else {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const first = workbook.SheetNames[0];
    if (!first) throw new Error('No worksheet found in this workbook.');
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[first], { defval: '' });
    if (rawRows.length) {
      const headers = Object.keys(rawRows[0]).map(h => h.trim().toLowerCase());
      hasRevenueColumn = headers.includes('attributed_revenue');
      const missing = required.filter(f => !headers.includes(f));
      if (missing.length) throw new Error(`First worksheet is missing required columns: ${missing.join(', ')}.`);
    }
  }
  const checked = validateRows(rawRows, hasRevenueColumn);
  if (checked.issues.length) throw new Error(checked.issues.slice(0, 16).join('\n') + (checked.issues.length > 16 ? `\n…and ${checked.issues.length - 16} more row errors.` : ''));
  return { rows: checked.rows, revenueAvailable: hasRevenueColumn };
}

function MultiSelect({ label, options, selected, onChange, testId }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; testId: string }) {
  const [open, setOpen] = useState(false);
  const toggle = (item: string) => onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item]);
  return <div className="relative min-w-[150px] flex-1">
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</label>
    <button data-testid={testId} onClick={() => setOpen(!open)} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm hover:border-primary/50">
      <span className="truncate">{selected.length ? `${selected.length} selected` : `All ${label.toLowerCase()}`}</span><ChevronDown size={15} />
    </button>
    {open && <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
      {options.length ? options.map(option => <button key={option} data-testid={`option-${testId}-${option}`} onClick={() => toggle(option)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted">
        <span className={`grid h-4 w-4 place-items-center rounded border ${selected.includes(option) ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{selected.includes(option) && <Check size={12} />}</span>{option}
      </button>) : <p className="px-3 py-2 text-sm text-muted-foreground">Upload campaign data first.</p>}
    </div>}
  </div>;
}
function MetricCard({ title, value, unit, detail, marker }: { title: string; value: string; unit: string; detail: string; marker: string }) {
  return <div className="panel px-5 py-4" data-testid={`metric-${marker}`}>
    <div className="flex items-center justify-between"><p className="text-[12px] font-semibold uppercase tracking-[.1em] text-muted-foreground">{title}</p><span className="h-2 w-2 rounded-full bg-primary/70" /></div>
    <p className="display mt-3 text-[29px] font-bold leading-none tracking-[-.04em]" data-testid={`value-${marker}`}>{value}</p>
    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{unit}</span><span className="mono">{detail}</span></div>
  </div>;
}
function ChartPanel({ title, subtitle, csvName, exportRows, children }: { title: string; subtitle: string; csvName: string; exportRows: Record<string, unknown>[]; children: React.ReactNode }) {
  return <section className="panel min-w-0 p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h2 className="display text-[17px] font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div>
      {exportRows.length > 0 && <button data-testid={`export-${csvName}`} onClick={() => downloadFile(`${csvName}.csv`, csv(exportRows), 'text/csv;charset=utf-8')} className="print-hidden rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Export ${title} data as CSV`}><Download size={16} /></button>}
    </div>
    {children}
  </section>;
}

export default function Dashboard() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [revenueAvailable, setRevenueAvailable] = useState(false);
  const [view, setView] = useState<ViewName>('Overview');
  const [filters, setFilters] = useState<Filters>({ startDate: '', endDate: '', channels: [], audiences: [], goals: [] });
  const [isDark, setIsDark] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fileName, setFileName] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: keyof Campaign; asc: boolean }>({ key: 'date', asc: false });
  const [question, setQuestion] = useState('');
  const assistant = useAskCampaignAssistant();
  const resetAssistantRef = useRef(assistant.reset);
  resetAssistantRef.current = assistant.reset;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);
  useEffect(() => { resetAssistantRef.current(); }, [filters, rows]);
  const audiences = useMemo(() => [...new Set(rows.map(r => r.audience))].sort(), [rows]);
  const goals = useMemo(() => [...new Set(rows.map(r => r.campaign_goal))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter(r => (!filters.startDate || r.date >= filters.startDate) && (!filters.endDate || r.date <= filters.endDate)
    && (!filters.channels.length || filters.channels.includes(r.channel)) && (!filters.audiences.length || filters.audiences.includes(r.audience))
    && (!filters.goals.length || filters.goals.includes(r.campaign_goal))), [rows, filters]);
  const summary = useMemo(() => aggregate(filtered), [filtered]);
  const platformData = useMemo(() => channels.map(channel => ({ channel, ...aggregate(filtered.filter(r => r.channel === channel)) })).filter(p => p.rowCount), [filtered]);
  const trendData = useMemo(() => {
    const map = new Map<string, Campaign[]>();
    filtered.forEach(r => map.set(r.date, [...(map.get(r.date) ?? []), r]));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...aggregate(values) }));
  }, [filtered]);
  const activeCount = Number(Boolean(filters.startDate)) + Number(Boolean(filters.endDate)) + filters.channels.length + filters.audiences.length + filters.goals.length;
  const handleFile = async (file?: File) => {
    if (!file) return;
    assistant.reset();
    setUploadError(''); setUploading(true);
    try {
      const parsed = await parseCampaignFile(file);
      setRows(parsed.rows); setRevenueAvailable(parsed.revenueAvailable); setFileName(file.name);
      setFilters({ startDate: '', endDate: '', channels: [], audiences: [], goals: [] });
      setView('Overview'); setQuery('');
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'Upload failed. Check the file and try again.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const resetFilters = () => { assistant.reset(); setFilters({ startDate: '', endDate: '', channels: [], audiences: [], goals: [] }); };
  const clearData = () => { assistant.reset(); setRows([]); setRevenueAvailable(false); setFileName(''); setUploadError(''); resetFilters(); };
  const filteredRows = useMemo(() => filtered.filter(row => [row.campaign_name, row.channel, row.audience, row.campaign_goal, row.date].join(' ').toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => { const av = a[sort.key], bv = b[sort.key]; const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv)); return sort.asc ? result : -result; }), [filtered, query, sort]);
  const metricCards = [
    { title: 'Spend', value: money(summary.spend), unit: 'USD invested', detail: `${summary.rowCount} campaign rows`, marker: 'spend' },
    { title: 'Attributed revenue', value: summary.attributedRevenue === null ? 'Unavailable' : money(summary.attributedRevenue), unit: 'USD attributed', detail: revenueAvailable ? 'Sum of attributed revenue' : 'Column not provided', marker: 'revenue' },
    { title: 'Clicks', value: number(summary.clicks), unit: 'total clicks', detail: `${summary.rowCount} rows`, marker: 'clicks' },
    { title: 'Conversions', value: number(summary.conversions), unit: 'attributed actions', detail: summary.clicks ? `${(summary.conversions / summary.clicks * 100).toFixed(2)}% click-to-conversion` : 'Rate unavailable', marker: 'conversions' },
    { title: 'Cost per action', value: summary.cpa === null ? 'Unavailable' : money(summary.cpa), unit: 'spend ÷ conversions', detail: 'CPA', marker: 'cpa' },
    { title: 'Return on spend', value: ratio(summary.roas, '×'), unit: 'revenue ÷ spend', detail: 'ROAS', marker: 'roas' },
    { title: 'Return on investment', value: summary.roi === null ? 'Unavailable' : `${(summary.roi * 100).toFixed(1)}%`, unit: '(revenue − spend) ÷ spend', detail: 'ROI', marker: 'roi' },
  ];
  const askAssistant = () => {
    const text = question.trim();
    if (!text || !filtered.length) return;
    assistant.reset();
    assistant.mutate({ data: { question: text, context: {
      currency: 'USD',
      filters: { ...(filters.startDate ? { startDate: filters.startDate } : {}), ...(filters.endDate ? { endDate: filters.endDate } : {}), channels: filters.channels, audiences: filters.audiences, goals: filters.goals },
      summary, platforms: platformData.map(({ channel, ...metrics }) => ({ channel, ...metrics })),
      trend: trendData.map(({ date, ...metrics }) => ({ date, ...metrics })),
    } } });
  };
  const setSortKey = (key: keyof Campaign) => setSort(current => ({ key, asc: current.key === key ? !current.asc : true }));
  const noData = rows.length === 0;
  const noMatches = rows.length > 0 && filtered.length === 0;
  const axis = isDark ? '#9ca6b3' : '#777d84';
  const grid = isDark ? 'rgba(255,255,255,.09)' : '#e9e3d9';
  const tabs: { label: ViewName; short: string }[] = [
    { label: 'Overview', short: '01' }, { label: 'Platform Comparison', short: '02' },
    { label: 'Campaign Details', short: '03' }, { label: 'Time Series', short: '04' },
  ];
  const toggleDate = (key: 'startDate' | 'endDate', value: string) => setFilters(f => ({ ...f, [key]: value }));

  return <div className="min-h-[100dvh] bg-background text-foreground">
    <aside className="print-hidden fixed inset-y-0 left-0 z-20 hidden w-[226px] flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-[76px] items-center gap-3 border-b border-sidebar-border px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><BarChart3 size={19} strokeWidth={2.5} /></div>
        <div><div className="display text-[12px] font-extrabold tracking-tight">Ad Campaign Analyzer</div></div>
      </div>
      <div className="px-4 pt-7">
        <p className="mono mb-3 px-3 text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/40">Workspace</p>
        {tabs.map(tab => <button key={tab.label} data-testid={`nav-${tab.label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setView(tab.label)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${view === tab.label ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
          <span className={`mono text-[10px] ${view === tab.label ? 'text-primary' : 'opacity-55'}`}>{tab.short}</span>{tab.label}
        </button>)}
      </div>
      <div className="mt-auto border-t border-sidebar-border px-6 py-5">
        <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/55"><span className={`h-1.5 w-1.5 rounded-full ${rows.length ? 'bg-emerald-400' : 'bg-sidebar-foreground/30'}`} />{rows.length ? `${rows.length} rows in this session` : 'No dataset loaded'}</div>
        <p className="mt-2 text-[10px] leading-relaxed text-sidebar-foreground/35">Your campaign data stays in this browser session.</p>
      </div>
    </aside>
    <main className="min-h-[100dvh] lg:ml-[226px]">
      <header className="print-hidden sticky top-0 z-10 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-5 py-3 backdrop-blur-md sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary lg:hidden"><BarChart3 size={19} /></div>
          <div className="min-w-0"><p className="mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Analysis workspace <span className="mx-1 text-primary">/</span> {view}</p><p className="mt-1 truncate text-[13px] font-semibold">{fileName || 'No campaign file loaded'}</p></div>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && <button onClick={clearData} data-testid="button-clear-data" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted sm:flex"><X size={14} /> Clear dataset</button>}
          <button onClick={() => window.print()} data-testid="button-print" title="Print / save report as PDF" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"><Printer size={16} /></button>
          <button onClick={() => setIsDark(v => !v)} data-testid="button-toggle-theme" title="Toggle dark mode" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted">{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button data-testid="button-upload-header" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"><UploadCloud size={15} />{rows.length ? 'Replace file' : 'Upload data'}</button>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 sm:py-8">
        {noData ? <div className="fade-up mx-auto max-w-4xl pt-3 sm:pt-10">
          <div className="mb-7 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-primary"><span className="h-px w-7 bg-primary" /> Performance, without the guesswork</div>
          <h1 className="display max-w-3xl text-[clamp(2.8rem,7vw,5.8rem)] font-extrabold leading-[.98] tracking-[-.065em]">Know what your<br /><span className="text-primary">spend is doing.</span></h1>
          <p className="mt-6 max-w-xl text-[15px] leading-7 text-muted-foreground">Bring campaign results into one clear view. Compare channels, trace outcomes over time, and trust every number back to the rows you uploaded.</p>
          <div className={`mt-9 rounded-2xl border-2 border-dashed ${dragging ? 'border-primary bg-primary/5' : 'border-border bg-card'} p-5 transition-colors sm:p-8`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}>
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><UploadCloud size={23} /></div>
                <div><h2 className="display text-lg font-bold">Upload campaign results</h2><p className="mt-1 text-sm text-muted-foreground">Drop a file here, or choose one from your device.</p><p className="mono mt-2 text-[10px] text-muted-foreground">CSV or XLSX · first worksheet · 10 MB max · 500 rows max</p></div>
              </div>
              <button onClick={() => fileRef.current?.click()} data-testid="button-choose-file" disabled={uploading} className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto">
                {uploading ? <><LoaderCircle className="animate-spin" size={16} />Reading file…</> : <>Choose file <span aria-hidden="true">→</span></>}
              </button>
            </div>
            {uploadError && <div data-testid="status-upload-error" role="alert" className="mt-5 whitespace-pre-line rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-[13px] leading-6 text-destructive"><div className="mb-1 font-bold">Upload rejected — nothing was imported.</div>{uploadError}</div>}
          </div>
          <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-semibold">Need a starting point?</p><p className="mt-1 text-xs text-muted-foreground">Use a template with the exact required columns.</p></div>
            <div className="flex gap-2">
              <button onClick={downloadCsvTemplate} data-testid="download-csv-template" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:bg-muted"><FileText size={15} /> CSV template</button>
              <button onClick={downloadXlsxTemplate} data-testid="download-xlsx-template" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:bg-muted"><FileSpreadsheet size={15} /> Excel template</button>
            </div>
          </div>
          <div className="mt-9 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
            {[['01', 'One file, one truth', 'Every view uses the same validated rows and active filters.'], ['02', 'Private by default', 'Files are parsed locally. Campaign rows are never sent to a server.'], ['03', 'Metrics you can audit', 'Spend and outcomes aggregate from the source rows, not estimates.']].map(([n, title, desc]) => <div key={n} className="flex gap-3"><span className="mono pt-0.5 text-[10px] text-primary">{n}</span><div><h3 className="text-xs font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</p></div></div>)}
          </div>
        </div> : <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-primary"><span className="h-px w-5 bg-primary" /> {view}</div>
              <h1 className="display text-[clamp(1.8rem,4vw,2.7rem)] font-extrabold leading-tight tracking-[-.05em]">{view === 'Overview' ? 'The numbers, in context.' : view === 'Platform Comparison' ? 'Where spend earns its keep.' : view === 'Campaign Details' ? 'Every campaign. Every result.' : 'Performance over time.'}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{filtered.length.toLocaleString()} of {rows.length.toLocaleString()} campaign rows in view {fileName ? `· ${fileName}` : ''}</p>
            </div>
            <div className="print-hidden flex items-center gap-2">
              <button onClick={downloadCsvTemplate} data-testid="download-csv-template-loaded" className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted sm:flex"><Download size={14} /> CSV format</button>
              <button onClick={downloadXlsxTemplate} data-testid="download-xlsx-template-loaded" className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted sm:flex"><Download size={14} /> Excel format</button>
            </div>
          </div>
          {uploadError && <div data-testid="status-upload-error" role="alert" className="mb-5 whitespace-pre-line rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-[12px] leading-5 text-destructive"><b className="mr-1">Replacement upload rejected.</b>{uploadError}</div>}
          <nav className="print-hidden mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="Analysis views">
            {tabs.map(tab => <button key={tab.label} data-testid={`tab-${tab.label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setView(tab.label)} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold transition-colors sm:px-4 ${view === tab.label ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><span className="mono mr-2 text-[9px] opacity-60">{tab.short}</span>{tab.label}</button>)}
          </nav>
          <section className="print-hidden panel mb-6 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-foreground"><CalendarDays size={15} /></div><div><h2 className="text-xs font-bold">Global filters</h2><p className="text-[10px] text-muted-foreground">Applied to every metric and view</p></div></div>
              <button onClick={resetFilters} data-testid="button-reset-filters" disabled={!activeCount} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40"><FilterX size={13} />Reset all{activeCount > 0 && <span className="mono rounded-full bg-primary/10 px-1.5 text-[9px] text-primary">{activeCount}</span>}</button></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div><label htmlFor="filter-start-date" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">From date</label><input id="filter-start-date" data-testid="filter-start-date" type="date" value={filters.startDate} onChange={e => toggleDate('startDate', e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
              <div><label htmlFor="filter-end-date" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Through date</label><input id="filter-end-date" data-testid="filter-end-date" type="date" value={filters.endDate} onChange={e => toggleDate('endDate', e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
              <MultiSelect label="Channels" options={channels} selected={filters.channels} onChange={v => setFilters(f => ({ ...f, channels: v }))} testId="filter-channels" />
              <MultiSelect label="Audiences" options={audiences} selected={filters.audiences} onChange={v => setFilters(f => ({ ...f, audiences: v }))} testId="filter-audiences" />
              <MultiSelect label="Goals" options={goals} selected={filters.goals} onChange={v => setFilters(f => ({ ...f, goals: v }))} testId="filter-goals" />
            </div>
          </section>
          {noMatches ? <div className="panel flex min-h-[330px] flex-col items-center justify-center px-6 text-center" data-testid="empty-no-results">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground"><Search size={23} /></div><h2 className="display text-xl font-bold">Nothing matches this filter set.</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">The uploaded file is intact. Widen the date range or clear one or more filters to see campaign results again.</p><button onClick={resetFilters} data-testid="button-clear-no-results" className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">Reset all filters</button>
          </div> : <>
            {view === 'Overview' && <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metricCards.map(m => <MetricCard key={m.marker} {...m} />)}
            </div>}
            {view === 'Overview' && <div className="fade-up space-y-5">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
                <ChartPanel title="Spend & conversions" subtitle="Daily spend in USD · conversion count on right axis" csvName="daily-spend-and-conversions" exportRows={trendData.map(d => ({ date: d.date, spend: d.spend, conversions: d.conversions }))}>
                  {trendData.length ? <ResponsiveContainer width="100%" height={278}><ComposedChart data={trendData} margin={{ top: 5, right: 4, bottom: 0, left: -12 }}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="date" tickFormatter={v => prettyDate(v)} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis yAxisId="spend" tickFormatter={compactMoney} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="conversions" orientation="right" tickFormatter={number} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={v => prettyDate(String(v), true)} formatter={(v: number, name: string) => [name === 'Spend' ? money(v) : number(v), name]} contentStyle={{ borderRadius: 9, border: `1px solid ${grid}`, background: 'var(--tooltip-bg, hsl(var(--card)))', color: 'hsl(var(--foreground))', fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11, color: axis }} /><Bar yAxisId="spend" dataKey="spend" name="Spend (USD)" fill="#c45d3b" fillOpacity={0.85} radius={[3, 3, 0, 0]} isAnimationActive={false} /><Line yAxisId="conversions" dataKey="conversions" name="Conversions" type="monotone" stroke="#448775" strokeWidth={2.5} dot={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer> : <ChartEmpty /> }
                </ChartPanel>
                <ChartPanel title="Channel allocation" subtitle="Spend across selected channels" csvName="channel-allocation" exportRows={platformData.map(p => ({ channel: p.channel, spend: p.spend, clicks: p.clicks, conversions: p.conversions, attributed_revenue: p.attributedRevenue }))}>
                  {platformData.length ? <div><ResponsiveContainer width="100%" height={222}><BarChart data={platformData} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 0 }}><CartesianGrid stroke={grid} horizontal={false} /><XAxis type="number" tickFormatter={compactMoney} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="channel" width={82} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 9, border: `1px solid ${grid}`, background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: 12 }} /><Bar dataKey="spend" name="Spend" radius={[0, 4, 4, 0]} isAnimationActive={false}>{platformData.map((p, i) => <Cell key={p.channel} fill={channelColors[p.channel] ?? chartColors[i]} />)}</Bar></BarChart></ResponsiveContainer><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{platformData.map(p => <span key={p.channel} className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><i className="h-2 w-2 rounded-full" style={{ background: channelColors[p.channel] }} />{p.channel}<b className="mono text-foreground">{money(p.spend)}</b></span>)}</div></div> : <ChartEmpty /> }
                </ChartPanel>
              </div>
              <CampaignTable rows={filteredRows} setSortKey={setSortKey} sort={sort} query={query} setQuery={setQuery} testPrefix="overview" />
              <AssistantPanel question={question} setQuestion={setQuestion} assistant={assistant} ask={askAssistant} hasData={filtered.length > 0} />
            </div>}
            {view === 'Platform Comparison' && <div className="fade-up space-y-5">
              <section className="panel p-5 sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="display text-lg font-bold">Outcome by channel</h2><p className="mt-1 text-xs text-muted-foreground">{revenueAvailable ? 'Compare spend, attributed revenue and conversion volume across platforms.' : 'Attributed revenue unavailable · source column not provided.'}</p></div>{platformData.length > 0 && <button data-testid="export-outcome-by-channel" onClick={() => downloadFile('outcome-by-channel.csv', csv(platformData.map(({ channel, ...metrics }) => ({ channel, ...metrics }))), 'text/csv;charset=utf-8')} className="print-hidden rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Export channel comparison chart data as CSV"><Download size={16} /></button>}</div>
                {platformData.length ? <ResponsiveContainer width="100%" height={320}><BarChart data={platformData} margin={{ top: 8, right: 12, left: 4, bottom: 5 }}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="channel" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis yAxisId="money" tickFormatter={compactMoney} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="actions" orientation="right" tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number, name: string) => [name === 'Conversions' ? number(value) : money(value), name]} contentStyle={{ borderRadius: 9, border: `1px solid ${grid}`, background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar yAxisId="money" dataKey="spend" name="Spend" fill="#c45d3b" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar yAxisId="money" dataKey="attributedRevenue" name="Attributed revenue" fill="#448775" radius={[3, 3, 0, 0]} isAnimationActive={false} hide={!revenueAvailable} /><Bar yAxisId="actions" dataKey="conversions" name="Conversions" fill="#617da2" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer> : <ChartEmpty />}</section>
              <PlatformTable data={platformData} />
              <AssistantPanel question={question} setQuestion={setQuestion} assistant={assistant} ask={askAssistant} hasData={filtered.length > 0} />
            </div>}
            {view === 'Campaign Details' && <div className="fade-up space-y-5"><CampaignTable rows={filteredRows} setSortKey={setSortKey} sort={sort} query={query} setQuery={setQuery} testPrefix="details" /><AssistantPanel question={question} setQuestion={setQuestion} assistant={assistant} ask={askAssistant} hasData={filtered.length > 0} /></div>}
            {view === 'Time Series' && <div className="fade-up space-y-5">
              <ChartPanel title="Daily performance" subtitle={revenueAvailable ? 'Spend and attributed revenue · values grouped by date' : 'Spend by date · attributed revenue unavailable'} csvName="daily-performance" exportRows={trendData.map(d => ({ date: d.date, spend: d.spend, clicks: d.clicks, conversions: d.conversions, attributed_revenue: d.attributedRevenue, cpa: d.cpa, roi: d.roi, roas: d.roas }))}>
                {trendData.length ? <ResponsiveContainer width="100%" height={360}><AreaChart data={trendData} margin={{ top: 10, right: 12, bottom: 2, left: -10 }}><defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c45d3b" stopOpacity={0.24} /><stop offset="100%" stopColor="#c45d3b" stopOpacity={0.015} /></linearGradient><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#448775" stopOpacity={0.2} /><stop offset="100%" stopColor="#448775" stopOpacity={0.015} /></linearGradient></defs><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="date" tickFormatter={v => prettyDate(v)} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={22} /><YAxis tickFormatter={compactMoney} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={v => prettyDate(String(v), true)} formatter={(v: number, name: string) => [money(v), name]} contentStyle={{ borderRadius: 9, border: `1px solid ${grid}`, background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Area type="monotone" dataKey="spend" name="Spend" stroke="#c45d3b" strokeWidth={2} fill="url(#spendFill)" isAnimationActive={false} /><Area type="monotone" dataKey="attributedRevenue" name="Attributed revenue" stroke="#448775" strokeWidth={2} fill="url(#revenueFill)" isAnimationActive={false} hide={!revenueAvailable} /></AreaChart></ResponsiveContainer> : <ChartEmpty /> }
              </ChartPanel>
              <ChartPanel title="Daily action volume" subtitle="Clicks and conversions · aggregated by date" csvName="daily-action-volume" exportRows={trendData.map(d => ({ date: d.date, clicks: d.clicks, conversions: d.conversions }))}>
                {trendData.length ? <ResponsiveContainer width="100%" height={270}><LineChart data={trendData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}><CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="date" tickFormatter={v => prettyDate(v)} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={22} /><YAxis tickFormatter={number} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={v => prettyDate(String(v), true)} formatter={(v: number, name: string) => [number(v), name]} contentStyle={{ borderRadius: 9, border: `1px solid ${grid}`, background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="clicks" name="Clicks" stroke="#617da2" strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="conversions" name="Conversions" stroke="#d7a94a" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer> : <ChartEmpty /> }
              </ChartPanel>
              <DailyTable data={trendData} />
              <AssistantPanel question={question} setQuestion={setQuestion} assistant={assistant} ask={askAssistant} hasData={filtered.length > 0} />
            </div>}
          </>}
          {rows.length > 0 && <div className="print-hidden mt-9 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><CircleHelp size={13} /> Calculations use the selected rows only. ROI is fractional in assistant context; dashboard values are displayed as percent.</span><span className="mono">SESSION-ONLY · USD</span></div>}
        </>}
      </div>
    </main>
    <input ref={fileRef} data-testid="input-campaign-file" className="hidden" type="file" accept=".csv,.xlsx" onChange={e => void handleFile(e.target.files?.[0])} />
  </div>;
}

function ChartEmpty() {
  return <div className="flex h-[250px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center" data-testid="empty-chart">
    <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground"><BarChart3 size={18} /></div><p className="text-sm font-semibold">No chartable data</p><p className="mt-1 text-xs text-muted-foreground">Upload rows or adjust the active filters.</p>
  </div>;
}
function CampaignTable({ rows, setSortKey, sort, query, setQuery, testPrefix }: { rows: Campaign[]; setSortKey: (key: keyof Campaign) => void; sort: { key: keyof Campaign; asc: boolean }; query: string; setQuery: (v: string) => void; testPrefix: string }) {
  const headers: [string, keyof Campaign, boolean?][] = [['Date', 'date'], ['Campaign', 'campaign_name'], ['Channel', 'channel'], ['Audience', 'audience'], ['Goal', 'campaign_goal'], ['Spend', 'spend', true], ['Clicks', 'clicks', true], ['Conversions', 'conversions', true], ['Revenue', 'attributed_revenue', true]];
  const displayed = rows;
  return <section className="panel min-w-0 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div><h2 className="display text-[17px] font-bold">Campaign rows</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{rows.length.toLocaleString()} matching {rows.length === 1 ? 'campaign' : 'campaigns'} · all matching rows shown</p></div>
      <div className="relative w-full sm:w-[240px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input data-testid={`search-${testPrefix}-campaigns`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search campaigns…" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary" /></div>
    </div>
    <div className="table-scroll"><table className="w-full min-w-[940px] border-collapse">
      <thead className="bg-muted/55"><tr>{headers.map(([label, key, right]) => <th key={key} onClick={() => setSortKey(key)} data-testid={`sort-${testPrefix}-${key}`} className={`cursor-pointer select-none px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground hover:text-foreground ${right ? 'text-right' : 'text-left'}`}>{label}<span className="ml-1">{sort.key === key ? sort.asc ? '↑' : '↓' : ''}</span></th>)}</tr></thead>
      <tbody>{displayed.length ? displayed.map((r, i) => <tr key={`${r.date}-${r.campaign_name}-${i}`} data-testid={`row-${testPrefix}-${i}`} className="border-t border-border/70 hover:bg-muted/30">
        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{prettyDate(r.date, true)}</td><td className="max-w-[230px] truncate px-4 py-3 text-[13px] font-semibold" title={r.campaign_name}>{r.campaign_name}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs"><i className="h-2 w-2 rounded-full" style={{ background: channelColors[r.channel] }} />{r.channel}</span></td><td className="px-4 py-3 text-xs text-muted-foreground">{r.audience}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.campaign_goal}</td><td className="mono px-4 py-3 text-right text-xs">{money(r.spend)}</td><td className="mono px-4 py-3 text-right text-xs">{number(r.clicks)}</td><td className="mono px-4 py-3 text-right text-xs">{number(r.conversions)}</td><td className="mono px-4 py-3 text-right text-xs">{r.attributed_revenue === null ? 'Unavailable' : money(r.attributed_revenue)}</td>
      </tr>) : <tr><td colSpan={9} className="h-36 text-center"><div className="text-sm font-semibold">{query ? 'No campaigns found' : 'No campaign rows'}</div><p className="mt-1 text-xs text-muted-foreground">{query ? 'Try another search term.' : 'Campaign details will appear here.'}</p></td></tr>}</tbody>
    </table></div>
  </section>;
}
function PlatformTable({ data }: { data: (Metric & { channel: Channel })[] }) {
  return <section className="panel overflow-hidden"><div className="border-b border-border px-5 py-4"><h2 className="display text-[17px] font-bold">Platform scorecard</h2><p className="mt-1 text-xs text-muted-foreground">Efficiency metrics are calculated from aggregate platform totals.</p></div>
    <div className="table-scroll"><table className="w-full min-w-[840px]"><thead className="bg-muted/55"><tr>{['Channel', 'Campaign rows', 'Spend', 'Clicks', 'Conversions', 'Revenue', 'CPA', 'ROAS', 'ROI'].map(h => <th key={h} className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground first:text-left">{h}</th>)}</tr></thead><tbody>{data.map(p => <tr key={p.channel} data-testid={`platform-row-${p.channel.toLowerCase().replace('/', '-')}`} className="border-t border-border/70"><td className="px-4 py-4 text-sm font-semibold"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: channelColors[p.channel] }} />{p.channel}</td><td className="mono px-4 py-4 text-right text-xs">{p.rowCount}</td><td className="mono px-4 py-4 text-right text-xs">{money(p.spend)}</td><td className="mono px-4 py-4 text-right text-xs">{number(p.clicks)}</td><td className="mono px-4 py-4 text-right text-xs">{number(p.conversions)}</td><td className="mono px-4 py-4 text-right text-xs">{p.attributedRevenue === null ? 'Unavailable' : money(p.attributedRevenue)}</td><td className="mono px-4 py-4 text-right text-xs">{p.cpa === null ? 'Unavailable' : money(p.cpa)}</td><td className="mono px-4 py-4 text-right text-xs">{ratio(p.roas, '×')}</td><td className="mono px-4 py-4 text-right text-xs">{p.roi === null ? 'Unavailable' : `${(p.roi * 100).toFixed(1)}%`}</td></tr>)}
      {data.length === 0 && <tr><td colSpan={9} className="py-14 text-center text-sm text-muted-foreground">No platform results for these filters.</td></tr>}</tbody></table></div>
  </section>;
}
function DailyTable({ data }: { data: (Metric & { date: string })[] }) {
  return <section className="panel overflow-hidden"><div className="border-b border-border px-5 py-4"><h2 className="display text-[17px] font-bold">Daily rollup</h2><p className="mt-1 text-xs text-muted-foreground">One row per date in the filtered dataset.</p></div>
    <div className="table-scroll max-h-[410px]"><table className="w-full min-w-[700px]"><thead className="sticky top-0 bg-muted/90"><tr>{['Date', 'Spend', 'Clicks', 'Conversions', 'Revenue', 'CPA', 'ROAS'].map((h, i) => <th key={h} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead><tbody>{data.map(d => <tr key={d.date} data-testid={`trend-row-${d.date}`} className="border-t border-border/70"><td className="px-4 py-3 text-xs">{prettyDate(d.date, true)}</td><td className="mono px-4 py-3 text-right text-xs">{money(d.spend)}</td><td className="mono px-4 py-3 text-right text-xs">{number(d.clicks)}</td><td className="mono px-4 py-3 text-right text-xs">{number(d.conversions)}</td><td className="mono px-4 py-3 text-right text-xs">{d.attributedRevenue === null ? 'Unavailable' : money(d.attributedRevenue)}</td><td className="mono px-4 py-3 text-right text-xs">{d.cpa === null ? 'Unavailable' : money(d.cpa)}</td><td className="mono px-4 py-3 text-right text-xs">{ratio(d.roas, '×')}</td></tr>)}</tbody></table></div>
  </section>;
}
function AssistantPanel({ question, setQuestion, assistant, ask, hasData }: { question: string; setQuestion: (v: string) => void; assistant: ReturnType<typeof useAskCampaignAssistant>; ask: () => void; hasData: boolean }) {
  const response = assistant.data;
  return <section className="panel overflow-hidden">
    <div className="flex flex-col justify-between gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:px-6">
      <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Lightbulb size={17} /></div><div><h2 className="display text-[17px] font-bold">Ask about this data</h2><p className="mt-1 text-xs text-muted-foreground">Only filtered aggregates are shared with the optional assistant. Raw campaign rows stay in your browser.</p></div></div>
      <span className="mono w-fit rounded-full border border-border px-2.5 py-1 text-[9px] uppercase tracking-[.1em] text-muted-foreground">Optional · Aggregate context only</span>
    </div>
    <div className="p-5 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row"><input data-testid="input-assistant-question" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask(); }} maxLength={500} placeholder="Which platform has the strongest return on spend?" className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3.5 text-sm outline-none focus:border-primary" />
        <button data-testid="button-ask-assistant" onClick={ask} disabled={!hasData || !question.trim() || assistant.isPending} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">{assistant.isPending ? <LoaderCircle className="animate-spin" size={15} /> : null}{assistant.isPending ? 'Analyzing…' : 'Ask assistant'}</button></div>
      {!hasData && <p className="mt-2 text-[11px] text-muted-foreground">Add data or adjust filters before asking a question.</p>}
      {assistant.isError && <div role="alert" data-testid="status-assistant-error" className="mt-4 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">The assistant is unavailable right now. Your dashboard data is unaffected. Try again later.</div>}
      {response && <div className="mt-5 rounded-xl bg-muted/55 p-4 sm:p-5" data-testid="assistant-response">
        <p className="whitespace-pre-wrap text-sm leading-6">{response.answer}</p>
        {response.evidence.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{response.evidence.map((item, i) => <div key={`${item.metric}-${item.scope}-${i}`} className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-muted-foreground">{item.metric} · {item.scope}</p><p className="mono mt-1 text-xs font-medium">{item.value} {item.unit}</p></div>)}</div>}
        {response.caveats.length > 0 && <div className="mt-4 text-[11px] leading-5 text-muted-foreground"><b className="text-foreground">Caveats:</b> {response.caveats.join(' ')}</div>}
        {response.suggestedFollowUp && <button onClick={() => { setQuestion(response.suggestedFollowUp ?? ''); }} data-testid="button-assistant-follow-up" className="mt-3 text-left text-xs font-semibold text-primary hover:underline">Suggested next question: {response.suggestedFollowUp}</button>}
      </div>}
    </div>
  </section>;
}
