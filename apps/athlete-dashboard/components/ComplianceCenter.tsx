/**
 * ComplianceCenter Component
 * Centralized compliance management for athletes
 */

import React, { useState, useEffect } from 'react';
import { SiloCloudNIL } from '../../silo-integration/SiloCloudNIL';

interface ComplianceCenterProps {
  athleteId: string;
  vaultAddress: string;
  siloCloud: SiloCloudNIL;
}

interface ComplianceData {
  kyc_status: {
    status: 'verified' | 'pending' | 'expired' | 'rejected';
    last_updated: Date;
    expiry_date: Date;
    documents_required: string[];
  };
  tax_compliance: {
    forms_generated: number;
    total_reportable_income: number;
    quarterly_reports: Array<{
      quarter: string;
      income: number;
      taxes_owed: number;
      status: 'filed' | 'pending' | 'overdue';
    }>;
  };
  ncaa_compliance: {
    eligibility_status: 'eligible' | 'ineligible' | 'under_review';
    deal_limit_used: number;
    deal_limit_total: number;
    recent_violations: Array<{
      date: Date;
      description: string;
      severity: 'minor' | 'major' | 'severe';
      resolved: boolean;
    }>;
  };
  audit_trail: Array<{
    id: string;
    timestamp: Date;
    action: string;
    amount?: number;
    deal_id?: string;
    compliance_impact: 'none' | 'low' | 'medium' | 'high';
  }>;
}

export const ComplianceCenter: React.FC<ComplianceCenterProps> = ({ 
  athleteId, 
  vaultAddress, 
  siloCloud 
}) => {
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tax' | 'ncaa' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
  }, [athleteId]);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      // Mock implementation - would fetch from SiloCloud API
      const mockData: ComplianceData = {
        kyc_status: {
          status: 'verified',
          last_updated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiry_date: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
          documents_required: []
        },
        tax_compliance: {
          forms_generated: 3,
          total_reportable_income: 25000,
          quarterly_reports: [
            {
              quarter: 'Q1 2024',
              income: 8000,
              taxes_owed: 1200,
              status: 'filed'
            },
            {
              quarter: 'Q2 2024',
              income: 12000,
              taxes_owed: 1800,
              status: 'filed'
            },
            {
              quarter: 'Q3 2024',
              income: 5000,
              taxes_owed: 750,
              status: 'pending'
            }
          ]
        },
        ncaa_compliance: {
          eligibility_status: 'eligible',
          deal_limit_used: 3,
          deal_limit_total: 10,
          recent_violations: []
        },
        audit_trail: [
          {
            id: 'audit_001',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            action: 'Deal payment received',
            amount: 5000,
            deal_id: 'deal_001',
            compliance_impact: 'low'
          },
          {
            id: 'audit_002',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            action: 'KYC documents updated',
            compliance_impact: 'medium'
          },
          {
            id: 'audit_003',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            action: 'New deal compliance approved',
            deal_id: 'deal_002',
            compliance_impact: 'high'
          }
        ]
      };
      setComplianceData(mockData);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTaxReport = async (quarter: string) => {
    try {
      const report = await siloCloud.generateComplianceReport(athleteId, {
        period: { start: new Date(), end: new Date() },
        report_type: 'transactions',
        format: 'pdf'
      });
      console.log('Generated tax report:', report);
      // Download or display report
    } catch (error) {
      console.error('Failed to generate tax report:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
      case 'eligible':
      case 'filed':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'under_review':
        return 'text-yellow-600 bg-yellow-100';
      case 'expired':
      case 'ineligible':
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KYC Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">KYC Status</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(complianceData?.kyc_status.status || '')}`}>
              {complianceData?.kyc_status.status}
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Last Updated: {complianceData?.kyc_status.last_updated.toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              Expires: {complianceData?.kyc_status.expiry_date.toLocaleDateString()}
            </p>
            {complianceData?.kyc_status.documents_required.length === 0 ? (
              <p className="text-sm text-green-600">✅ All documents up to date</p>
            ) : (
              <div>
                <p className="text-sm text-red-600">Documents needed:</p>
                <ul className="text-xs text-gray-500">
                  {complianceData?.kyc_status.documents_required.map((doc, index) => (
                    <li key={index}>• {doc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* NCAA Compliance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">NCAA Status</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(complianceData?.ncaa_compliance.eligibility_status || '')}`}>
              {complianceData?.ncaa_compliance.eligibility_status}
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Deal Limit Usage</p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ 
                      width: `${(complianceData?.ncaa_compliance.deal_limit_used || 0) / (complianceData?.ncaa_compliance.deal_limit_total || 1) * 100}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900">
                  {complianceData?.ncaa_compliance.deal_limit_used}/{complianceData?.ncaa_compliance.deal_limit_total}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Recent Violations</p>
              <p className={`text-sm font-medium ${complianceData?.ncaa_compliance.recent_violations.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {complianceData?.ncaa_compliance.recent_violations.length === 0 ? '✅ Clean record' : `⚠️ ${complianceData?.ncaa_compliance.recent_violations.length} violations`}
              </p>
            </div>
          </div>
        </div>

        {/* Tax Compliance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tax Status</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Forms Generated: {complianceData?.tax_compliance.forms_generated}
            </p>
            <p className="text-sm text-gray-600">
              Total Reportable Income: ${complianceData?.tax_compliance.total_reportable_income?.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              Current Quarter: {complianceData?.tax_compliance.quarterly_reports?.[2]?.status}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'tax', label: 'Tax Reports', icon: '🧾' },
              { id: 'ncaa', label: 'NCAA Compliance', icon: '🏈' },
              { id: 'audit', label: 'Audit Trail', icon: '📋' }
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
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold">Compliance Overview</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium mb-3">Automated Compliance Features</h5>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Real-time deal compliance checking</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Automatic tax form generation</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>NCAA eligibility monitoring</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>ISO 20022 payment compliance</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium mb-3">Compliance Score</h5>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">98%</div>
                    <p className="text-sm text-gray-600">Excellent compliance standing</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Tax Reports</h4>
                <button
                  onClick={() => generateTaxReport('current')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Generate Report
                </button>
              </div>
              <div className="space-y-4">
                {complianceData?.tax_compliance.quarterly_reports.map((report, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">{report.quarter}</h5>
                        <p className="text-sm text-gray-600">
                          Income: ${report.income.toLocaleString()} • 
                          Taxes Owed: ${report.taxes_owed.toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ncaa' && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold">NCAA Compliance Details</h4>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-green-500 text-xl mr-2">✅</span>
                  <div>
                    <p className="font-medium text-green-800">Fully Compliant</p>
                    <p className="text-sm text-green-600">All deals meet NCAA requirements</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium mb-2">Deal Monitoring</h5>
                  <p className="text-sm text-gray-600">
                    Automatic monitoring ensures all NIL deals comply with NCAA regulations, 
                    including fair market value assessment and conflict of interest checks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold">Audit Trail</h4>
              <div className="space-y-4">
                {complianceData?.audit_trail.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{entry.action}</p>
                        <p className="text-sm text-gray-600">
                          {entry.timestamp.toLocaleDateString()} at {entry.timestamp.toLocaleTimeString()}
                        </p>
                        {entry.amount && (
                          <p className="text-sm text-gray-600">Amount: ${entry.amount.toLocaleString()}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        entry.compliance_impact === 'high' ? 'bg-red-100 text-red-800' :
                        entry.compliance_impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        entry.compliance_impact === 'low' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.compliance_impact} impact
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};