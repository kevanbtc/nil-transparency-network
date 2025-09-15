/**
 * Brand Analytics Dashboard
 * ROI tracking and deal onboarding for sponsors
 */

import React, { useState, useEffect } from 'react';
import { SiloCloudNIL, NILDeal } from '../silo-integration/SiloCloudNIL';
import { DealOnboarding } from './components/DealOnboarding';
import { ROIDashboard } from './components/ROIDashboard';
import { CampaignManager } from './components/CampaignManager';
import { AthleteDatabase } from './components/AthleteDatabase';

interface BrandAnalyticsProps {
  brandId: string;
  siloCloud: SiloCloudNIL;
}

interface BrandData {
  name: string;
  total_spend: number;
  active_campaigns: number;
  roi_score: number;
  deals: NILDeal[];
  campaign_metrics: {
    impressions: number;
    engagement_rate: number;
    conversion_rate: number;
    cost_per_engagement: number;
  };
}

export const BrandAnalytics: React.FC<BrandAnalyticsProps> = ({ brandId, siloCloud }) => {
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'onboard' | 'campaigns' | 'athletes'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrandData();
  }, [brandId]);

  const loadBrandData = async () => {
    try {
      setLoading(true);
      // Mock implementation - would fetch from SiloCloud API
      const mockData: BrandData = {
        name: "SportsCorp",
        total_spend: 150000,
        active_campaigns: 12,
        roi_score: 3.2, // 320% return
        deals: [
          {
            deal_id: "deal_001",
            athlete_id: "athlete_001",
            brand_name: "SportsCorp",
            brand_address: "0xbrand1",
            amount: 5000,
            currency: "USD",
            deliverables: ["Instagram posts (5)", "TikTok videos (3)", "Event appearance"],
            platform_source: "opendorse",
            status: "completed",
            revenue_splits: { athlete: 70, school: 15, collective: 10, platform: 5 },
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            compliance_approved: true
          },
          {
            deal_id: "deal_002",
            athlete_id: "athlete_002",
            brand_name: "SportsCorp",
            brand_address: "0xbrand1",
            amount: 8000,
            currency: "USD",
            deliverables: ["YouTube video", "Social media takeover", "Product endorsement"],
            platform_source: "inflcr",
            status: "active",
            revenue_splits: { athlete: 70, school: 15, collective: 10, platform: 5 },
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            compliance_approved: true
          }
        ],
        campaign_metrics: {
          impressions: 2500000,
          engagement_rate: 4.2,
          conversion_rate: 1.8,
          cost_per_engagement: 0.12
        }
      };
      setBrandData(mockData);
    } catch (error) {
      console.error('Failed to load brand data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDealCreate = async (dealData: any) => {
    try {
      const dealId = await siloCloud.createNILDeal({
        athlete_id: dealData.athlete_id,
        brand_address: dealData.brand_address,
        amount: dealData.amount,
        deliverables: dealData.deliverables,
        revenue_splits: dealData.revenue_splits
      });
      console.log('Deal created:', dealId);
      loadBrandData(); // Refresh data
    } catch (error) {
      console.error('Failed to create deal:', error);
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
              <h1 className="text-2xl font-bold text-gray-900">{brandData?.name}</h1>
              <p className="text-gray-500">NIL Brand Portal</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Investment</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${brandData?.total_spend.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">ROI Score</p>
                <p className="text-xl font-semibold text-green-600">
                  {brandData?.roi_score}x
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📈' },
              { id: 'onboard', label: 'Create Deal', icon: '➕' },
              { id: 'campaigns', label: 'Campaigns', icon: '📢' },
              { id: 'athletes', label: 'Athletes', icon: '🏃‍♂️' }
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
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Impressions</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {(brandData?.campaign_metrics.impressions || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">💚</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Engagement Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {brandData?.campaign_metrics.engagement_rate}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {brandData?.campaign_metrics.conversion_rate}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Cost per Engagement</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${brandData?.campaign_metrics.cost_per_engagement}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ROI Dashboard */}
            <ROIDashboard brandData={brandData} />
          </div>
        )}

        {activeTab === 'onboard' && (
          <DealOnboarding
            brandId={brandId}
            onDealCreate={handleDealCreate}
            siloCloud={siloCloud}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignManager
            brandId={brandId}
            deals={brandData?.deals || []}
            siloCloud={siloCloud}
          />
        )}

        {activeTab === 'athletes' && (
          <AthleteDatabase
            brandId={brandId}
            siloCloud={siloCloud}
          />
        )}
      </main>
    </div>
  );
};

export default BrandAnalytics;