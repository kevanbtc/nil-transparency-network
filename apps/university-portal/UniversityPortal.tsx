/**
 * University Compliance Portal
 * One-pane-of-glass view for all athlete NIL activity and compliance
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SiloCloudNIL } from '../silo-integration/SiloCloudNIL';
import { ComplianceDashboard } from './src/components/ComplianceDashboard';
import { AthleteOverview } from './src/components/AthleteOverview';
import { RevenueSharing } from './src/components/RevenueSharing';
import { ComplianceReports } from './src/components/ComplianceReports';
import { AutomatedCompliance } from './src/components/AutomatedCompliance';

type TabKey = 'overview' | 'athletes' | 'revenue' | 'reports' | 'automation';

interface UniversityPortalProps {
  universityId: string;
  siloCloud: SiloCloudNIL;
}

export interface UniversityData {
  name: string;
  athletes: AthleteData[];
  compliance_status: {
    ncaa_compliant: boolean;
    irs_compliant: boolean;
    iso20022_compliant: boolean;
    last_audit: string; // ISO date string for serialization safety
  };
  nil_activity: {
    total_volume: number;          // in USD (or primary fiat)
    active_deals: number;
    pending_approvals: number;
    revenue_share: number;         // bps or percent? Treat as percent (0-100)
  };
  regulatory_alerts: ComplianceAlert[];
}

export interface AthleteData {
  id: string;
  name: string;
  sport: string;
  vault_address: string;
  total_earnings: number;
  active_deals: number;
  compliance_status: 'compliant' | 'warning' | 'violation';
  last_activity: string; // ISO date string
}

export interface ComplianceAlert {
  id: string;
  athlete_name: string;
  type: 'kyc_expiry' | 'deal_review' | 'payment_flag' | 'eligibility_check';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string; // ISO date string
  resolved: boolean;
}

/** ---------- Small UI helpers ---------- */

const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div role="status" className="flex items-center gap-2 text-slate-600">
    <svg
      aria-hidden="true"
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
    </svg>
    <span>{label}</span>
  </div>
);

const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800 flex items-center justify-between gap-4">
    <span className="font-medium">Error:</span>
    <span className="flex-1">{message}</span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-red-300 px-3 py-1 text-sm hover:bg-red-100"
      >
        Retry
      </button>
    )}
  </div>
);

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview',   label: 'Overview' },
  { key: 'athletes',   label: 'Athletes' },
  { key: 'revenue',    label: 'Revenue' },
  { key: 'reports',    label: 'Reports' },
  { key: 'automation', label: 'Automation' },
];

/** ---------- Feature detection helpers for SiloCloudNIL ---------- */

type Maybe<T> = T | undefined;

function hasFn<T extends keyof any>(obj: unknown, fn: T): obj is Record<T, Function> {
  return !!obj && typeof (obj as any)[fn] === 'function';
}

interface SiloCloudUniversityAPI {
  getUniversityDashboard?: (universityId: string) => Promise<UniversityData>;
  listUniversityAthletes?: (universityId: string) => Promise<AthleteData[]>;
  getUniversityOverview?: (universityId: string) => Promise<Omit<UniversityData, 'athletes' | 'regulatory_alerts'> & { regulatory_alerts?: ComplianceAlert[] }>;
  subscribeToComplianceAlerts?: (universityId: string, cb: (alert: ComplianceAlert) => void) => { unsubscribe: () => void };
}

/** ---------- Mock fallback (used only if API surface is incomplete) ---------- */

function mockUniversityData(universityId: string): UniversityData {
  const now = new Date().toISOString();
  return {
    name: `University ${universityId.slice(0, 6).toUpperCase()}`,
    athletes: [
      {
        id: 'ath_001',
        name: 'Jordan Rivers',
        sport: 'Basketball',
        vault_address: '0xVaultAth001',
        total_earnings: 124500,
        active_deals: 3,
        compliance_status: 'compliant',
        last_activity: now,
      },
      {
        id: 'ath_002',
        name: 'Riley Chen',
        sport: 'Swimming',
        vault_address: '0xVaultAth002',
        total_earnings: 45750,
        active_deals: 1,
        compliance_status: 'warning',
        last_activity: now,
      },
    ],
    compliance_status: {
      ncaa_compliant: true,
      irs_compliant: true,
      iso20022_compliant: true,
      last_audit: now,
    },
    nil_activity: {
      total_volume: 375_000,
      active_deals: 8,
      pending_approvals: 2,
      revenue_share: 12.5,
    },
    regulatory_alerts: [
      {
        id: 'al_001',
        athlete_name: 'Riley Chen',
        type: 'kyc_expiry',
        severity: 'medium',
        description: 'KYC document expiring in 14 days.',
        created_at: now,
        resolved: false,
      },
    ],
  };
}

/** ---------- Main Component ---------- */

export const UniversityPortal: React.FC<UniversityPortalProps> = ({ universityId, siloCloud }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Maybe<string>>();
  const [universityData, setUniversityData] = useState<Maybe<UniversityData>>();
  const alertsUnsubRef = useRef<Maybe<() => void>>(undefined);

  const uniApi = useMemo<SiloCloudUniversityAPI>(() => (siloCloud as unknown as SiloCloudUniversityAPI) || {}, [siloCloud]);

  const loadUniversityData = async () => {
    setLoading(true);
    setError(undefined);
    try {
      // Preferred single-call API if available
      if (hasFn(uniApi, 'getUniversityDashboard')) {
        const data = await uniApi.getUniversityDashboard!(universityId);
        setUniversityData(normalizeUniversityData(data));
        return;
      }

      // Compose from parts if needed
      let overview: any = {};
      if (hasFn(uniApi, 'getUniversityOverview')) {
        overview = await uniApi.getUniversityOverview!(universityId);
      }

      let athletes: AthleteData[] = [];
      if (hasFn(uniApi, 'listUniversityAthletes')) {
        athletes = await uniApi.listUniversityAthletes!(universityId);
      }

      // If still missing, use a deterministic mock so UI remains functional
      if (!overview || !overview.compliance_status || athletes.length === 0) {
        const mock = mockUniversityData(universityId);
        // merge any real bits we may have
        setUniversityData(normalizeUniversityData({
          ...mock,
          ...overview,
          athletes: athletes.length ? athletes : mock.athletes,
          regulatory_alerts: overview?.regulatory_alerts ?? mock.regulatory_alerts,
        } as UniversityData));
        return;
      }

      setUniversityData(normalizeUniversityData({
        name: overview.name ?? `University ${universityId.slice(0, 6).toUpperCase()}`,
        athletes,
        compliance_status: overview.compliance_status,
        nil_activity: overview.nil_activity,
        regulatory_alerts: overview.regulatory_alerts ?? [],
      } as UniversityData));
    } catch (e: any) {
      // Use mock data but show error so operators know something failed upstream
      const mock = mockUniversityData(universityId);
      setUniversityData(mock);
      setError(e?.message ?? 'Failed to load university data.');
    } finally {
      setLoading(false);
    }
  };

  // Normalize dates to ISO strings and cap odd values
  function normalizeUniversityData(data: UniversityData): UniversityData {
    const iso = (d: any) => (typeof d === 'string' ? d : new Date(d).toISOString());
    return {
      ...data,
      compliance_status: {
        ...data.compliance_status,
        last_audit: iso(data.compliance_status.last_audit),
      },
      nil_activity: {
        ...data.nil_activity,
        revenue_share: clampNumber(data.nil_activity.revenue_share, 0, 100),
      },
      athletes: (data.athletes || []).map(a => ({
        ...a,
        last_activity: iso(a.last_activity),
      })),
      regulatory_alerts: (data.regulatory_alerts || []).map(a => ({
        ...a,
        created_at: iso(a.created_at),
      })),
    };
  }

  function clampNumber(n: any, min: number, max: number) {
    const v = typeof n === 'number' ? n : Number(n ?? 0);
    return Math.min(max, Math.max(min, isFinite(v) ? v : 0));
  }

  // Initial load + cleanup
  useEffect(() => {
    void loadUniversityData();

    // Live compliance alerts if available
    if (alertsUnsubRef.current) {
      alertsUnsubRef.current();
      alertsUnsubRef.current = undefined;
    }

    if (hasFn(uniApi, 'subscribeToComplianceAlerts')) {
      const sub = uniApi.subscribeToComplianceAlerts!(universityId, (alert) => {
        setUniversityData(prev => {
          if (!prev) return prev;
          // De-dupe by id
          const existing = new Map(prev.regulatory_alerts.map(a => [a.id, a]));
          existing.set(alert.id, {
            ...alert,
            created_at: typeof alert.created_at === 'string' ? alert.created_at : new Date(alert.created_at).toISOString(),
          });
          return { ...prev, regulatory_alerts: Array.from(existing.values()) };
        });
      });
      alertsUnsubRef.current = sub?.unsubscribe;
    } else {
      // Polling fallback every 30s
      const iv = setInterval(() => void loadUniversityData(), 30_000);
      alertsUnsubRef.current = () => clearInterval(iv);
    }

    return () => {
      alertsUnsubRef.current?.();
      alertsUnsubRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universityId, uniApi.getUniversityDashboard, uniApi.getUniversityOverview, uniApi.listUniversityAthletes, uniApi.subscribeToComplianceAlerts]);

  const onResolveAlert = (alertId: string) => {
    setUniversityData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        regulatory_alerts: prev.regulatory_alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a),
      };
    });
  };

  /** Accessible tab nav (arrow keys, Home/End) */
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const handleKeyDownTabs: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const currentIndex = tabs.findIndex(t => t.key === activeTab);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (e.key === 'ArrowLeft')  nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home')       nextIndex = 0;
    if (e.key === 'End')        nextIndex = tabs.length - 1;
    if (nextIndex !== currentIndex) {
      setActiveTab(tabs[nextIndex].key);
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
      buttons?.[nextIndex]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          University Compliance Portal
        </h1>
        <p className="text-sm text-slate-600">
          One-pane-of-glass for NIL activity, compliance, booster transparency, and payouts.
        </p>
      </header>

      {/* Status & actions row */}
      <div className="mb-4 flex items-center justify-between gap-4">
        {loading ? <Spinner label="Loading university data…" /> : (
          <div className="text-sm text-slate-600">
            {universityData?.name ? <span className="font-medium">{universityData.name}</span> : '—'}
            {universityData?.compliance_status?.last_audit && (
              <span className="ml-3">
                Last audit:&nbsp;
                {new Date(universityData.compliance_status.last_audit).toLocaleString()}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadUniversityData()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            aria-label="Refresh data"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => void loadUniversityData()} />
        </div>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="University portal sections"
        ref={tabListRef}
        onKeyDown={handleKeyDownTabs}
        className="mb-4 flex gap-2 border-b border-slate-200"
      >
        {tabs.map(({ key, label }) => {
          const selected = activeTab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${key}`}
              id={`tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-2 text-sm rounded-t-md ${
                selected
                  ? 'bg-white border-x border-t border-slate-200 -mb-px font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <section
        role="tabpanel"
        id="panel-overview"
        aria-labelledby="tab-overview"
        hidden={activeTab !== 'overview'}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <ComplianceDashboard
          athletes={universityData?.athletes ?? []}
          nil_activity={universityData?.nil_activity ?? { total_volume: 0, active_deals: 0, pending_approvals: 0, revenue_share: 0 }}
          regulatory_status={universityData?.compliance_status ?? { ncaa_compliant: false, irs_compliant: false, iso20022_compliant: false, last_audit: new Date().toISOString() }}
          alerts={universityData?.regulatory_alerts ?? []}
          onResolveAlert={onResolveAlert}
        />
      </section>

      <section
        role="tabpanel"
        id="panel-athletes"
        aria-labelledby="tab-athletes"
        hidden={activeTab !== 'athletes'}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <AthleteOverview
          athletes={universityData?.athletes ?? []}
          onSelectAthlete={(athId) => {
            // You can navigate or open a side panel here
            console.debug('Selected athlete', athId);
          }}
        />
      </section>

      <section
        role="tabpanel"
        id="panel-revenue"
        aria-labelledby="tab-revenue"
        hidden={activeTab !== 'revenue'}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <RevenueSharing
          school_percentage={(universityData?.nil_activity?.revenue_share ?? 0)}
          total_nil_volume={(universityData?.nil_activity?.total_volume ?? 0)}
          quarterly_reports={[
            // Replace with real data when available
            { quarter: 'Q1', volume: Math.round((universityData?.nil_activity?.total_volume ?? 0) * 0.22) },
            { quarter: 'Q2', volume: Math.round((universityData?.nil_activity?.total_volume ?? 0) * 0.25) },
            { quarter: 'Q3', volume: Math.round((universityData?.nil_activity?.total_volume ?? 0) * 0.28) },
            { quarter: 'Q4', volume: Math.round((universityData?.nil_activity?.total_volume ?? 0) * 0.25) },
          ]}
        />
      </section>

      <section
        role="tabpanel"
        id="panel-reports"
        aria-labelledby="tab-reports"
        hidden={activeTab !== 'reports'}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <ComplianceReports
          universityId={universityId}
          iso20022={{ compliant: universityData?.compliance_status?.iso20022_compliant ?? false }}
          onGenerate={(opts) => {
            console.debug('Generate compliance report', opts);
            // Wire to SiloCloud report generation if available
          }}
        />
      </section>

      <section
        role="tabpanel"
        id="panel-automation"
        aria-labelledby="tab-automation"
        hidden={activeTab !== 'automation'}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <AutomatedCompliance
          ruleset={universityData?.compliance_status ? [
            { key: 'ncaa', label: 'NCAA Rules', enabled: universityData.compliance_status.ncaa_compliant },
            { key: 'irs', label: 'IRS Reporting', enabled: universityData.compliance_status.irs_compliant },
            { key: 'iso20022', label: 'ISO 20022 Messages', enabled: universityData.compliance_status.iso20022_compliant },
          ] : []}
          onToggleRule={(key, enabled) => {
            console.debug('Toggle rule', key, enabled);
            // Hook into PolicyManager / ComplianceRegistry via API
          }}
          onSimulate={() => {
            console.debug('Simulate policy impact');
            // Run a dry-run compliance evaluation
          }}
        />
      </section>
    </div>
  );
};

export default UniversityPortal;