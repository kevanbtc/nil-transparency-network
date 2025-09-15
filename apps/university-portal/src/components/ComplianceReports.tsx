import React, { useState } from 'react';

interface ComplianceReportsProps {
  universityId: string;
  iso20022: {
    compliant: boolean;
  };
  onGenerate: (options: {
    reportType: string;
    dateRange: { start: Date; end: Date };
    format: string;
  }) => void;
}

export const ComplianceReports: React.FC<ComplianceReportsProps> = ({
  universityId,
  iso20022,
  onGenerate
}) => {
  const [reportType, setReportType] = useState('comprehensive');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
    end: new Date()
  });
  const [format, setFormat] = useState('pdf');

  const handleGenerateReport = () => {
    onGenerate({
      reportType,
      dateRange,
      format
    });
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const recentReports = [
    {
      id: '1',
      name: 'Monthly NCAA Report',
      type: 'NCAA Compliance',
      generatedAt: new Date('2024-09-01'),
      status: 'completed'
    },
    {
      id: '2',
      name: 'Quarterly Financial Summary',
      type: 'Financial',
      generatedAt: new Date('2024-08-15'),
      status: 'completed'
    },
    {
      id: '3',
      name: 'IRS 1099 Preparation',
      type: 'Tax Compliance',
      generatedAt: new Date('2024-08-01'),
      status: 'in_progress'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Compliance Reports</h2>
      </div>

      {/* Report Generator */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Generate New Report</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="comprehensive">Comprehensive</option>
              <option value="ncaa">NCAA Compliance</option>
              <option value="financial">Financial Summary</option>
              <option value="tax">Tax Compliance</option>
              <option value="iso20022">ISO 20022 Messages</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={formatDate(dateRange.start)}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                className="flex-1 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={formatDate(dateRange.end)}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                className="flex-1 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleGenerateReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <div className="font-medium">NCAA Compliant</div>
              <div className="text-xs text-slate-600">All deals reviewed</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <div className="font-medium">IRS Compliant</div>
              <div className="text-xs text-slate-600">Tax reporting up to date</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${iso20022.compliant ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div>
              <div className="font-medium">ISO 20022</div>
              <div className="text-xs text-slate-600">
                {iso20022.compliant ? 'Messages compliant' : 'Needs attention'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>
        {recentReports.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium">No reports generated yet</div>
            <div className="text-sm">Generated reports will appear here</div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{report.name}</div>
                  <div className="text-sm text-slate-600">{report.type}</div>
                  <div className="text-xs text-slate-500">
                    Generated on {report.generatedAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    report.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {report.status === 'completed' ? 'Complete' : 'In Progress'}
                  </span>
                  {report.status === 'completed' && (
                    <button className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled Reports */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Scheduled Reports</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="font-medium">Monthly NCAA Report</span>
            <span className="text-slate-600">Due in 5 days</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="font-medium">Quarterly Financial Summary</span>
            <span className="text-slate-600">Due in 12 days</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-medium">Annual Compliance Audit</span>
            <span className="text-slate-600">Due in 45 days</span>
          </div>
        </div>
      </div>
    </div>
  );
};