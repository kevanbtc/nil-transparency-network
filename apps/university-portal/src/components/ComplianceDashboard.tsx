import React from 'react';
import { AthleteData, ComplianceAlert } from '../../UniversityPortal';

interface ComplianceDashboardProps {
  athletes: AthleteData[];
  nil_activity: {
    total_volume: number;
    active_deals: number;
    pending_approvals: number;
    revenue_share: number;
  };
  regulatory_status: {
    ncaa_compliant: boolean;
    irs_compliant: boolean;
    iso20022_compliant: boolean;
    last_audit: string;
  };
  alerts: ComplianceAlert[];
  onResolveAlert: (alertId: string) => void;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  athletes,
  nil_activity,
  regulatory_status,
  alerts,
  onResolveAlert
}) => {
  const unreadAlerts = alerts.filter(alert => !alert.resolved);
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.resolved);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">Total Athletes</div>
            <div className="text-2xl">👥</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{athletes.length}</div>
          <div className="text-xs text-slate-500">
            {athletes.filter(a => a.compliance_status === 'compliant').length} compliant
          </div>
        </div>
        
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">Active Deals</div>
            <div className="text-2xl">📋</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{nil_activity.active_deals}</div>
          <div className="text-xs text-slate-500">
            {nil_activity.pending_approvals} pending approval
          </div>
        </div>
        
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">Total Volume</div>
            <div className="text-2xl">💰</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${nil_activity.total_volume.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">This academic year</div>
        </div>
        
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">Compliance Score</div>
            <div className="text-2xl">✅</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {regulatory_status.ncaa_compliant && regulatory_status.irs_compliant && regulatory_status.iso20022_compliant ? '100' : '75'}/100
          </div>
          <div className="text-xs text-slate-500">Regulatory adherence</div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-red-800 font-medium">Critical Alerts ({criticalAlerts.length})</div>
          </div>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{alert.athlete_name}</div>
                  <div className="text-xs text-slate-600">{alert.description}</div>
                </div>
                <button
                  onClick={() => onResolveAlert(alert.id)}
                  className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Status */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${regulatory_status.ncaa_compliant ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">NCAA Compliant</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${regulatory_status.irs_compliant ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">IRS Compliant</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${regulatory_status.iso20022_compliant ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">ISO 20022 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};