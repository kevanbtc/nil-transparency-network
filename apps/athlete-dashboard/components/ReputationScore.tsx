/**
 * ReputationScore Component
 * Displays Proof-of-Success and Proof-of-Loyalty scores for athletes
 */

import React, { useState, useEffect } from 'react';
import { SiloCloudNIL } from '../../silo-integration/SiloCloudNIL';

interface ReputationScoreProps {
  athleteId: string;
  siloCloud: SiloCloudNIL;
}

interface ReputationData {
  proof_of_success: {
    score: number;
    factors: {
      engagement_rate: number;
      content_consistency: number;
      brand_collaboration: number;
      performance_metrics: number;
    };
    trend: 'up' | 'down' | 'stable';
  };
  proof_of_loyalty: {
    score: number;
    factors: {
      fan_retention: number;
      community_building: number;
      platform_consistency: number;
      school_alignment: number;
    };
    trend: 'up' | 'down' | 'stable';
  };
  overall_reputation: number;
  industry_ranking: number;
  comparable_athletes: string[];
}

export const ReputationScore: React.FC<ReputationScoreProps> = ({ athleteId, siloCloud }) => {
  const [reputationData, setReputationData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReputationData();
  }, [athleteId]);

  const loadReputationData = async () => {
    try {
      setLoading(true);
      // Mock implementation - would fetch from SiloCloud API
      const mockData: ReputationData = {
        proof_of_success: {
          score: 85,
          factors: {
            engagement_rate: 88,
            content_consistency: 92,
            brand_collaboration: 78,
            performance_metrics: 83
          },
          trend: 'up'
        },
        proof_of_loyalty: {
          score: 91,
          factors: {
            fan_retention: 94,
            community_building: 89,
            platform_consistency: 87,
            school_alignment: 95
          },
          trend: 'stable'
        },
        overall_reputation: 88,
        industry_ranking: 156,
        comparable_athletes: ['Jordan Smith', 'Alex Johnson', 'Taylor Brown']
      };
      setReputationData(mockData);
    } catch (error) {
      console.error('Failed to load reputation data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 80) return 'bg-blue-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '📊';
      default: return '📊';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Reputation */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg text-white">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Overall Reputation Score</h2>
              <p className="text-purple-100">Portable across brands and schools</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{reputationData?.overall_reputation}</div>
              <div className="text-sm text-purple-100">
                Industry Rank #{reputationData?.industry_ranking}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proof of Success */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Proof-of-Success</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getTrendIcon(reputationData?.proof_of_success.trend || 'stable')}</span>
                <div className={`text-3xl font-bold ${getScoreColor(reputationData?.proof_of_success.score || 0)}`}>
                  {reputationData?.proof_of_success.score}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {Object.entries(reputationData?.proof_of_success.factors || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{value}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`mt-4 p-3 rounded-lg ${getScoreBgColor(reputationData?.proof_of_success.score || 0)}`}>
              <p className="text-sm font-medium">
                {reputationData?.proof_of_success.score && reputationData.proof_of_success.score >= 85
                  ? "🏆 Elite performer - Premium brand deals available"
                  : reputationData?.proof_of_success.score && reputationData.proof_of_success.score >= 75
                  ? "⭐ Strong performer - Good brand opportunities"
                  : "📈 Growing talent - Focus on consistency"}
              </p>
            </div>
          </div>
        </div>

        {/* Proof of Loyalty */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Proof-of-Loyalty</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getTrendIcon(reputationData?.proof_of_loyalty.trend || 'stable')}</span>
                <div className={`text-3xl font-bold ${getScoreColor(reputationData?.proof_of_loyalty.score || 0)}`}>
                  {reputationData?.proof_of_loyalty.score}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {Object.entries(reputationData?.proof_of_loyalty.factors || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{value}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`mt-4 p-3 rounded-lg ${getScoreBgColor(reputationData?.proof_of_loyalty.score || 0)}`}>
              <p className="text-sm font-medium">
                {reputationData?.proof_of_loyalty.score && reputationData.proof_of_loyalty.score >= 90
                  ? "💎 Loyalty champion - Long-term partnerships available"
                  : reputationData?.proof_of_loyalty.score && reputationData.proof_of_loyalty.score >= 80
                  ? "🤝 Reliable partner - Good retention rates"
                  : "🌱 Building community - Focus on fan engagement"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reputation History Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Reputation Trends</h3>
        </div>
        <div className="p-6">
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-500">Reputation trend chart would be displayed here</p>
              <p className="text-sm text-gray-400">Integration with charting library needed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparable Athletes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Comparable Athletes</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reputationData?.comparable_athletes.map((athlete, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {athlete.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{athlete}</p>
                  <p className="text-sm text-gray-500">Similar performance profile</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reputation Insights */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Reputation Insights</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Strong School Alignment</p>
                <p className="text-sm text-gray-600">
                  Your content consistently supports your school's brand and values
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-sm">!</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Brand Collaboration Opportunity</p>
                <p className="text-sm text-gray-600">
                  Consider partnering with more premium brands to boost your success score
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">i</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Portable Reputation</p>
                <p className="text-sm text-gray-600">
                  Your reputation score travels with you across transfers and professional transitions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};