import React, { useState } from 'react';

interface Rule {
  key: string;
  label: string;
  enabled: boolean;
}

interface AutomatedComplianceProps {
  ruleset: Rule[];
  onToggleRule: (key: string, enabled: boolean) => void;
  onSimulate: () => void;
}

export const AutomatedCompliance: React.FC<AutomatedComplianceProps> = ({
  ruleset,
  onToggleRule,
  onSimulate
}) => {
  const [simulationRunning, setSimulationRunning] = useState(false);

  const handleSimulate = async () => {
    setSimulationRunning(true);
    try {
      await onSimulate();
    } finally {
      setTimeout(() => setSimulationRunning(false), 2000); // Mock simulation time
    }
  };

  const enabledRules = ruleset.filter(rule => rule.enabled);
  const complianceScore = ruleset.length > 0 ? Math.round((enabledRules.length / ruleset.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Automated Compliance</h2>
        <div className="text-sm text-slate-600">
          {enabledRules.length} of {ruleset.length} rules active
        </div>
      </div>

      {/* Compliance Score */}
      <div className="rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Overall Compliance Score</h3>
          <div className="text-3xl font-bold text-slate-900">{complianceScore}%</div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              complianceScore >= 90 ? 'bg-green-500' :
              complianceScore >= 75 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${complianceScore}%` }}
          />
        </div>
        <div className="text-sm text-slate-600 mt-2">
          {complianceScore >= 90 ? 'Excellent compliance posture' :
           complianceScore >= 75 ? 'Good compliance, some improvements needed' :
           'Compliance attention required'}
        </div>
      </div>

      {/* Rule Management */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Compliance Rules</h3>
        {ruleset.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-medium">No compliance rules configured</div>
            <div className="text-sm">Rules will appear here once configured</div>
          </div>
        ) : (
          <div className="space-y-3">
            {ruleset.map((rule) => (
              <div key={rule.key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <div>
                    <div className="font-medium text-slate-900">{rule.label}</div>
                    <div className="text-xs text-slate-600">
                      {rule.enabled ? 'Active' : 'Inactive'} compliance rule
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => onToggleRule(rule.key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulation */}
      <div className="rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Policy Impact Simulation</h3>
          <button
            onClick={handleSimulate}
            disabled={simulationRunning}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              simulationRunning
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {simulationRunning ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </div>
        <div className="text-sm text-slate-600">
          Test the impact of your compliance rules on existing deals and athlete activities.
          This will help identify potential issues before applying changes to production.
        </div>
      </div>

      {/* Automation Status */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Automation Status</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <div className="text-green-600 text-sm">✓</div>
            </div>
            <div>
              <div className="font-medium text-slate-900">Deal Monitoring</div>
              <div className="text-xs text-slate-600">Automatically monitoring all NIL deals</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <div className="text-green-600 text-sm">✓</div>
            </div>
            <div>
              <div className="font-medium text-slate-900">Alert Generation</div>
              <div className="text-xs text-slate-600">Real-time compliance alerts enabled</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <div className="text-yellow-600 text-sm">!</div>
            </div>
            <div>
              <div className="font-medium text-slate-900">Report Generation</div>
              <div className="text-xs text-slate-600">Scheduled reports configured</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <div className="text-blue-600 text-sm">⚙</div>
            </div>
            <div>
              <div className="font-medium text-slate-900">Policy Enforcement</div>
              <div className="text-xs text-slate-600">
                {enabledRules.length > 0 ? 'Active enforcement' : 'No policies active'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Automation Activity</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <div>
              <span className="font-medium">NCAA Rule Check</span>
              <span className="text-slate-600 ml-2">• Deal ID #2024-0015</span>
            </div>
            <span className="text-xs text-slate-500">2 min ago</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <div>
              <span className="font-medium">IRS Compliance Alert</span>
              <span className="text-slate-600 ml-2">• Q3 reporting due</span>
            </div>
            <span className="text-xs text-slate-500">1 hour ago</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <span className="font-medium">ISO 20022 Validation</span>
              <span className="text-slate-600 ml-2">• Payment message verified</span>
            </div>
            <span className="text-xs text-slate-500">3 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};