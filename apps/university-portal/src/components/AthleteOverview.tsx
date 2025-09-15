import React from 'react';
import { AthleteData } from '../../UniversityPortal';

interface AthleteOverviewProps {
  athletes: AthleteData[];
  onSelectAthlete: (athleteId: string) => void;
}

export const AthleteOverview: React.FC<AthleteOverviewProps> = ({
  athletes,
  onSelectAthlete
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Athlete Overview</h2>
        <div className="text-sm text-slate-600">
          {athletes.length} athletes
        </div>
      </div>
      
      {athletes.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <div className="text-4xl mb-2">👥</div>
          <div className="text-lg font-medium">No athletes found</div>
          <div className="text-sm">Athletes will appear here once registered</div>
        </div>
      ) : (
        <div className="space-y-3">
          {athletes.map((athlete) => (
            <div
              key={athlete.id}
              className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 cursor-pointer transition-colors"
              onClick={() => onSelectAthlete(athlete.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{athlete.name}</h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
                      {athlete.sport}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      athlete.compliance_status === 'compliant'
                        ? 'bg-green-100 text-green-800'
                        : athlete.compliance_status === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {athlete.compliance_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{athlete.active_deals} active deals</span>
                    <span>•</span>
                    <span>Last activity: {new Date(athlete.last_activity).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Vault: {athlete.vault_address.slice(0, 10)}...{athlete.vault_address.slice(-8)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900">
                    ${athlete.total_earnings.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">Total earnings</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};