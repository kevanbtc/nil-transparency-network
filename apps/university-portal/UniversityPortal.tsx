/**
 * University Compliance Portal
 * One-pane-of-glass view for all athlete NIL activity and compliance
 */

import React, { useState, useEffect } from 'react';
import { SiloCloudNIL } from '../silo-integration/SiloCloudNIL';
import { ComplianceDashboard } from './components/ComplianceDashboard';
import { AthleteOverview } from './components/AthleteOverview';
import { RevenueSharing } from './components/RevenueSharing';
import { ComplianceReports } from './components/ComplianceReports';
import { AutomatedCompliance } from './components/AutomatedCompliance';

interface UniversityPortalProps {
  universityId: string;
  siloCloud: SiloCloudNIL;
}

interface UniversityData {
  name: string;
  athletes: AthleteData[];
  compliance_status: {
    ncaa_compliant: boolean;
    irs_compliant: boolean;
    iso20022_compliant: boolean;
    last_audit: Date;
  };
  nil_activity: {
    total_volume: number;
    active_deals: number;
    pending_approvals: number;
    revenue_share: number;
  };
  regulatory_alerts: ComplianceAlert[];
}

interface AthleteData {
  id: string;
  name: string;
  sport: string;
  vault_address: string;
  total_earnings: number;
  active_deals: number;
  compliance_status: 'compliant' | 'warning' | 'violation';
  last_activity: Date;
}

interface ComplianceAlert {
  id: string;
  athlete_name: string;
  type: 'kyc_expiry' | 'deal_review' | 'payment_flag' | 'eligibility_check';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: Date;
  resolved: boolean;
}

export const UniversityPortal: React.FC<UniversityPortalProps> = ({ universityId, siloCloud }) => {
  const [universityData, setUniversityData] = useState<UniversityData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'athletes' | 'revenue' | 'reports' | 'automation'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUniversityData();
  }, [universityId]);

  const loadUniversityData = async () => {
    try {
      setLoading(true);
      // Mock implementation - would fetch from SiloCloud API
      const mockData: UniversityData = {
        name: "State University",
        athletes: [
          {
            id: "athlete_001",
            name: "Jordan Mitchell",
            sport: "Basketball",
            vault_address: "0x1234...5678",
            total_earnings: 25000,
            active_deals: 3,
            compliance_status: "compliant",
            last_activity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            id: "athlete_002",
            name: "Sarah Johnson",
            sport: "Soccer",
            vault_address: "0x5678...9012",
            total_earnings: 18500,
            active_deals: 2,
            compliance_status: "warning",
            last_activity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          },
          {
            id: "athlete_003",
            name: "Mike Chen",
            sport: "Swimming",
            vault_address: "0x9012...3456",
            total_earnings: 12000,
            active_deals: 1,
            compliance_status: "compliant",
            last_activity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          }
        ],
        compliance_status: {
          ncaa_compliant: true,
          irs_compliant: true,
          iso20022_compliant: true,
          last_audit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        nil_activity: {
          total_volume: 125000,
          active_deals: 8,
          pending_approvals: 2,
          revenue_share: 15 // 15% to university
        },
        regulatory_alerts: [
          {
            id: "alert_001",
            athlete_name: "Sarah Johnson",
            type: "deal_review",
            severity: "medium",
            description: "New deal requires manual compliance review",
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
            resolved: false
          },
          {
            id: "alert_002", 
            athlete_name: "Jordan Mitchell",
            type: "kyc_expiry",
            severity: "low",
            description: "KYC documentation expires in 30 days",
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
            resolved: false
          }
        ]
      };
      setUniversityData(mockData);
    } catch (error) {
      console.error('Failed to load university data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateComplianceReport = async (reportType: string) => {
    try {
      const report = await siloCloud.generateComplianceReport(universityId, {
        period: { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
        report_type: reportType as any,
        format: 'pdf'
      });
      console.log('Generated report:', report);
      // Open download or show success message
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{universityData?.name}</h1>
              <p className="text-gray-500">NIL Compliance Portal</p>
            </div>
            <div className="flex items-center space-x-6">
              {/* Compliance Status Indicators */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded-full ${universityData?.compliance_status.ncaa_compliant ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-gray-600">NCAA</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded-full ${universityData?.compliance_status.irs_compliant ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-gray-600">IRS</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded-full ${universityData?.compliance_status.iso20022_compliant ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-gray-600">ISO 20022</span>
                </div>
              </div>
              <button
                onClick={() => generateComplianceReport('comprehensive')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'athletes', label: 'Athletes', icon: '👤' },
              { id: 'revenue', label: 'Revenue', icon: '💰' },
              { id: 'reports', label: 'Reports', icon: '📋' },
              { id: 'automation', label: 'Automation', icon: '⚡' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <ComplianceDashboard
            universityData={universityData}
            onAlertResolve={(alertId) => {
              // Handle alert resolution
              console.log('Resolving alert:', alertId);
            }}
          />
        )}

        {activeTab === 'athletes' && (
          <AthleteOverview
            athletes={universityData?.athletes || []}
            siloCloud={siloCloud}
          />
        )}

        {activeTab === 'revenue' && (
          <RevenueSharing
            nilActivity={universityData?.nil_activity}
            athletes={universityData?.athletes || []}
          />
        )}

        {activeTab === 'reports' && (
          <ComplianceReports
            universityId={universityId}
            onGenerateReport={generateComplianceReport}
            siloCloud={siloCloud}
          />
        )}

        {activeTab === 'automation' && (
          <AutomatedCompliance
            universityId={universityId}
            complianceStatus={universityData?.compliance_status}
            siloCloud={siloCloud}
          />
        )}
      </main>
    </div>
  );
};

export default UniversityPortal;