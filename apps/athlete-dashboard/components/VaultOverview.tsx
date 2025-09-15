/**
 * VaultOverview Component
 * Shows athlete's NIL token balance, pending deals, and earnings overview
 */

import React from 'react';
import { AthleteProfile, NILDeal } from '../../silo-integration/SiloCloudNIL';

interface VaultOverviewProps {
  vaultInfo: {
    address: string;
    balance: string;
    deals: NILDeal[];
  } | null;
  deals: NILDeal[];
  athleteProfile: AthleteProfile | null;
}

export const VaultOverview: React.FC<VaultOverviewProps> = ({ vaultInfo, deals, athleteProfile }) => {
  const totalEarnings = deals.reduce((sum, deal) => sum + deal.amount, 0);
  const activeDeals = deals.filter(deal => deal.status === 'active').length;
  const pendingDeals = deals.filter(deal => deal.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Vault Balance</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${vaultInfo?.balance || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Earnings</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${totalEarnings.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Deals</p>
              <p className="text-2xl font-semibold text-gray-900">{activeDeals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingDeals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {deals.slice(0, 5).map((deal) => (
            <div key={deal.deal_id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    deal.status === 'active' ? 'bg-green-400' :
                    deal.status === 'pending' ? 'bg-yellow-400' :
                    deal.status === 'completed' ? 'bg-blue-400' :
                    'bg-gray-400'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{deal.brand_name}</p>
                    <p className="text-sm text-gray-500">
                      {deal.deliverables.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    ${deal.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{deal.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-gray-50 text-right">
          <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            View all deals →
          </a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50">
              <span className="text-2xl mb-2">🎥</span>
              <span className="text-sm font-medium text-gray-900">Start Stream</span>
            </button>
            <button className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50">
              <span className="text-2xl mb-2">👕</span>
              <span className="text-sm font-medium text-gray-900">Drop Merch</span>
            </button>
            <button className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50">
              <span className="text-2xl mb-2">🖼️</span>
              <span className="text-sm font-medium text-gray-900">Mint NFT</span>
            </button>
            <button className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50">
              <span className="text-2xl mb-2">📊</span>
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vault Info */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Vault Information</h3>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Vault Address</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {vaultInfo?.address || athleteProfile?.vault_address}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Eligibility Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  athleteProfile?.eligibility_status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {athleteProfile?.eligibility_status || 'Unknown'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">NIL Domain</dt>
              <dd className="mt-1 text-sm text-blue-600 font-medium">
                {athleteProfile?.nil_subdomain}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">School</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {athleteProfile?.school}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};