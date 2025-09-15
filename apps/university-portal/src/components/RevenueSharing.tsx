import React from 'react';

interface RevenueReport {
  quarter: string;
  volume: number;
}

interface RevenueSharingProps {
  school_percentage: number;
  total_nil_volume: number;
  quarterly_reports: RevenueReport[];
}

export const RevenueSharing: React.FC<RevenueSharingProps> = ({
  school_percentage,
  total_nil_volume,
  quarterly_reports
}) => {
  const school_revenue = (total_nil_volume * school_percentage) / 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Revenue Sharing</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* School Revenue Share */}
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-lg font-semibold mb-4">University Revenue Share</h3>
          <div className="text-3xl font-bold text-slate-900 mb-2">
            {school_percentage.toFixed(1)}%
          </div>
          <div className="text-sm text-slate-600 mb-4">
            Average percentage from NIL deals
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total University Revenue:</span>
              <span className="font-medium">${school_revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Monthly Average:</span>
              <span className="font-medium">${(school_revenue / 12).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Revenue Distribution</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Athletes</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-slate-200 rounded">
                  <div 
                    className="h-full bg-blue-500 rounded"
                    style={{ width: `${100 - school_percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{(100 - school_percentage).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">University</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-slate-200 rounded">
                  <div 
                    className="h-full bg-green-500 rounded"
                    style={{ width: `${school_percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{school_percentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quarterly Reports */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Quarterly Revenue Reports</h3>
        {quarterly_reports.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">No quarterly data available</div>
            <div className="text-sm">Reports will appear as data is collected</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {quarterly_reports.map((report, index) => (
              <div key={report.quarter} className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  ${report.volume.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">{report.quarter}</div>
                <div className="text-xs text-slate-500">
                  School: ${((report.volume * school_percentage) / 100).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue Insights */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Revenue Insights</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="text-xl font-semibold text-slate-900">
              ${total_nil_volume.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600">Total NIL Volume</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-slate-900">
              ${school_revenue.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600">University Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-slate-900">
              ${(total_nil_volume - school_revenue).toLocaleString()}
            </div>
            <div className="text-sm text-slate-600">Athlete Earnings</div>
          </div>
        </div>
      </div>
    </div>
  );
};