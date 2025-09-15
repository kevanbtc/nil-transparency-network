import React from 'react';
import { useQuery } from 'react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { apiClient } from '../services/apiClient';

export const Dashboard: React.FC = () => {
  // Fetch overview data
  const { data: overview, isLoading: overviewLoading } = useQuery(
    'overview',
    () => apiClient.getAnalyticsOverview(),
    { refetchInterval: 30000 }
  );

  // Fetch recent deals
  const { data: recentDeals, isLoading: dealsLoading } = useQuery(
    'recent-deals',
    () => apiClient.getDeals({ page: 1, limit: 5 })
  );

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Athletes',
      value: overview?.totalAthletes || 0,
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Active Deals',
      value: overview?.activeDeals || 0,
      change: '+5%',
      changeType: 'positive',
    },
    {
      name: 'Total Volume',
      value: `$${(overview?.totalVolume || 0).toLocaleString()}`,
      change: '+23%',
      changeType: 'positive',
    },
    {
      name: 'Compliance Rate',
      value: `${overview?.complianceRate || 0}%`,
      change: '+0.5%',
      changeType: 'positive',
    },
  ];

  const chartData = [
    { name: 'Jan', deals: 12, volume: 45000 },
    { name: 'Feb', deals: 19, volume: 67000 },
    { name: 'Mar', deals: 15, volume: 52000 },
    { name: 'Apr', deals: 25, volume: 89000 },
    { name: 'May', deals: 32, volume: 125000 },
    { name: 'Jun', deals: 28, volume: 98000 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of your NIL transparency network performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white p-6 rounded-lg shadow border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div
                className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Deals Chart */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Deals Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="deals" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Volume Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Volume']} />
              <Line type="monotone" dataKey="volume" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Deals</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {!dealsLoading && recentDeals?.data?.map((deal: any) => (
            <div key={deal.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">
                      {deal.athleteName?.charAt(0) || 'A'}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">
                    {deal.athleteName || 'Unknown Athlete'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {deal.brandName} • ${deal.amount?.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    deal.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : deal.status === 'active'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {deal.status}
                </span>
              </div>
            </div>
          ))}
          {dealsLoading && (
            <div className="px-6 py-8 text-center">
              <div className="animate-pulse">Loading recent deals...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};