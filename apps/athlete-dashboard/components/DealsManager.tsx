/**
 * DealsManager Component
 * Manages athlete's NIL deals with status tracking and execution
 */

import React, { useState } from 'react';
import { SiloCloudNIL, NILDeal } from '../../silo-integration/SiloCloudNIL';

interface DealsManagerProps {
  deals: NILDeal[];
  onDealUpdate: () => void;
  siloCloud: SiloCloudNIL;
}

export const DealsManager: React.FC<DealsManagerProps> = ({ deals, onDealUpdate, siloCloud }) => {
  const [selectedDeal, setSelectedDeal] = useState<NILDeal | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  const filteredDeals = deals.filter(deal => 
    filterStatus === 'all' || deal.status === filterStatus
  );

  const handleDealAction = async (dealId: string, action: 'accept' | 'reject' | 'complete') => {
    try {
      console.log(`${action}ing deal ${dealId}`);
      // In a real implementation, this would call the appropriate SiloCloud API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      onDealUpdate();
    } catch (error) {
      console.error(`Failed to ${action} deal:`, error);
    }
  };

  const getStatusColor = (status: NILDeal['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: NILDeal['platform_source']) => {
    switch (platform) {
      case 'opendorse': return '🏈';
      case 'inflcr': return '📱';
      case 'basepath': return '🏫';
      case 'silo': return '☁️';
      default: return '💼';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">NIL Deals</h2>
        <div className="flex items-center space-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Deals</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Deals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Deals', value: deals.length, color: 'bg-blue-500' },
          { label: 'Pending', value: deals.filter(d => d.status === 'pending').length, color: 'bg-yellow-500' },
          { label: 'Active', value: deals.filter(d => d.status === 'active').length, color: 'bg-green-500' },
          { label: 'Total Value', value: `$${deals.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}`, color: 'bg-purple-500' }
        ].map((stat, index) => (
          <div key={index} className={`${stat.color} rounded-lg p-4 text-white`}>
            <p className="text-sm font-medium opacity-90">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Deals List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {filterStatus === 'all' ? 'All' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Deals
          </h3>
        </div>
        
        {filteredDeals.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>No {filterStatus === 'all' ? '' : filterStatus} deals found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDeals.map((deal) => (
              <div key={deal.deal_id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">{getPlatformIcon(deal.platform_source)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {deal.brand_name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(deal.status)}`}>
                          {deal.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {deal.deliverables.join(' • ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Via {deal.platform_source} • Created {deal.created_at.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ${deal.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        You get ${Math.round(deal.amount * deal.revenue_splits.athlete / 100).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedDeal(deal);
                          setShowDealModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                      
                      {deal.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDealAction(deal.deal_id, 'accept')}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDealAction(deal.deal_id, 'reject')}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      
                      {deal.status === 'active' && (
                        <button
                          onClick={() => handleDealAction(deal.deal_id, 'complete')}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Revenue Split Visualization */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">Revenue Split</p>
                  <div className="flex items-center space-x-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-l"
                      style={{ width: `${deal.revenue_splits.athlete}%` }}
                      title={`You: ${deal.revenue_splits.athlete}%`}
                    ></div>
                    <div 
                      className="bg-green-500 h-2"
                      style={{ width: `${deal.revenue_splits.school}%` }}
                      title={`School: ${deal.revenue_splits.school}%`}
                    ></div>
                    <div 
                      className="bg-yellow-500 h-2"
                      style={{ width: `${deal.revenue_splits.collective}%` }}
                      title={`Collective: ${deal.revenue_splits.collective}%`}
                    ></div>
                    <div 
                      className="bg-gray-500 h-2 rounded-r"
                      style={{ width: `${deal.revenue_splits.platform}%` }}
                      title={`Platform: ${deal.revenue_splits.platform}%`}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>You ({deal.revenue_splits.athlete}%)</span>
                    <span>School ({deal.revenue_splits.school}%)</span>
                    <span>Collective ({deal.revenue_splits.collective}%)</span>
                    <span>Platform ({deal.revenue_splits.platform}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deal Details Modal */}
      {showDealModal && selectedDeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Deal Details</h3>
                <button
                  onClick={() => setShowDealModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Brand & Campaign</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{getPlatformIcon(selectedDeal.platform_source)}</span>
                      <h5 className="font-semibold">{selectedDeal.brand_name}</h5>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedDeal.status)}`}>
                        {selectedDeal.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Deal ID: {selectedDeal.deal_id}
                    </p>
                    <p className="text-sm text-gray-600">
                      Platform: {selectedDeal.platform_source}
                    </p>
                  </div>
                </div>

                {/* Deliverables */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Deliverables</h4>
                  <div className="space-y-2">
                    {selectedDeal.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm">{deliverable}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Financial Breakdown</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Deal Value</p>
                        <p className="font-semibold">${selectedDeal.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Your Share ({selectedDeal.revenue_splits.athlete}%)</p>
                        <p className="font-semibold text-green-600">
                          ${Math.round(selectedDeal.amount * selectedDeal.revenue_splits.athlete / 100).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">School Share</p>
                        <p className="font-medium">
                          ${Math.round(selectedDeal.amount * selectedDeal.revenue_splits.school / 100).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Collective Share</p>
                        <p className="font-medium">
                          ${Math.round(selectedDeal.amount * selectedDeal.revenue_splits.collective / 100).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Status */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Compliance Status</h4>
                  <div className="flex items-center space-x-2">
                    <span className={selectedDeal.compliance_approved ? 'text-green-500' : 'text-yellow-500'}>
                      {selectedDeal.compliance_approved ? '✅' : '⏳'}
                    </span>
                    <span className="text-sm">
                      {selectedDeal.compliance_approved ? 'Approved' : 'Under Review'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {selectedDeal.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleDealAction(selectedDeal.deal_id, 'reject');
                          setShowDealModal(false);
                        }}
                        className="px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50"
                      >
                        Reject Deal
                      </button>
                      <button
                        onClick={() => {
                          handleDealAction(selectedDeal.deal_id, 'accept');
                          setShowDealModal(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Accept Deal
                      </button>
                    </>
                  )}
                  {selectedDeal.status === 'active' && (
                    <button
                      onClick={() => {
                        handleDealAction(selectedDeal.deal_id, 'complete');
                        setShowDealModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Mark as Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};