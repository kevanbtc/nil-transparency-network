/**
 * EngagementHub Component
 * SiloCloud-style engagement features: streaming, merch, NFTs, tips
 */

import React, { useState } from 'react';
import { SiloCloudNIL, StreamConfig } from '../../silo-integration/SiloCloudNIL';

interface EngagementHubProps {
  athleteId: string;
  onStartStream: (config: StreamConfig) => void;
  onLaunchMerch: () => void;
  onMintNFT: () => void;
  siloCloud: SiloCloudNIL;
}

export const EngagementHub: React.FC<EngagementHubProps> = ({
  athleteId,
  onStartStream,
  onLaunchMerch,
  onMintNFT,
  siloCloud
}) => {
  const [activeStream, setActiveStream] = useState<any>(null);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamConfig, setStreamConfig] = useState<Partial<StreamConfig>>({
    title: '',
    description: '',
    category: 'gaming',
    privacy: 'public',
    monetization: {
      tips_enabled: true,
      nil_tokens_only: false,
      min_tip_amount: 5
    }
  });

  const handleStartStream = async () => {
    if (streamConfig.title && streamConfig.description) {
      onStartStream(streamConfig as StreamConfig);
      setActiveStream({
        title: streamConfig.title,
        viewers: 0,
        tips_earned: 0,
        duration: '00:00'
      });
      setShowStreamModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Stream */}
      {activeStream && (
        <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-lg shadow-lg text-white">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-red-300 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">LIVE</span>
                </div>
                <h3 className="text-xl font-bold">{activeStream.title}</h3>
                <p className="text-red-100">
                  {activeStream.viewers} viewers • {activeStream.duration}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-red-100">Tips Earned</p>
                <p className="text-2xl font-bold">${activeStream.tips_earned}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Livestream */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-4xl">🎥</span>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Streaming</h3>
            <p className="text-sm text-gray-600 mb-4">
              Stream workouts, gaming, or behind-the-scenes content. Earn NIL tokens through tips and subscriptions.
            </p>
            <button
              onClick={() => setShowStreamModal(true)}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {activeStream ? 'Streaming Live' : 'Start Stream'}
            </button>
          </div>
        </div>

        {/* Merchandise */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-4xl">👕</span>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Merch Drops</h3>
            <p className="text-sm text-gray-600 mb-4">
              Launch limited edition merchandise. Fans can buy with fiat, crypto, or NIL tokens.
            </p>
            <button
              onClick={onLaunchMerch}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Launch Drop
            </button>
          </div>
        </div>

        {/* NFTs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <span className="text-4xl">🖼️</span>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">NFT Collection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Mint game moments, training highlights, or exclusive art. Build your digital legacy.
            </p>
            <button
              onClick={onMintNFT}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Mint NFT
            </button>
          </div>
        </div>
      </div>

      {/* Fan Engagement Stats */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Fan Engagement</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">1,234</div>
              <div className="text-sm text-gray-500">Total Followers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">56</div>
              <div className="text-sm text-gray-500">Active Subscribers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">$2,431</div>
              <div className="text-sm text-gray-500">Tips This Month</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">8.5</div>
              <div className="text-sm text-gray-500">Engagement Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tips */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Tips</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {[
            { user: 'SportsFan23', amount: 25, message: 'Great game last night!', time: '2 min ago' },
            { user: 'Basketball_Pro', amount: 50, message: 'Keep grinding 💪', time: '15 min ago' },
            { user: 'TeamSupporter', amount: 10, message: 'Go team!', time: '1 hour ago' }
          ].map((tip, index) => (
            <div key={index} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tip.user}</p>
                  <p className="text-sm text-gray-500">{tip.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">${tip.amount}</p>
                  <p className="text-xs text-gray-400">{tip.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stream Setup Modal */}
      {showStreamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Start Live Stream</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stream Title
                </label>
                <input
                  type="text"
                  value={streamConfig.title}
                  onChange={(e) => setStreamConfig({ ...streamConfig, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter stream title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={streamConfig.description}
                  onChange={(e) => setStreamConfig({ ...streamConfig, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Describe what you'll be streaming..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={streamConfig.category}
                  onChange={(e) => setStreamConfig({ ...streamConfig, category: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="gaming">Gaming</option>
                  <option value="workout">Workout</option>
                  <option value="interview">Interview</option>
                  <option value="behind_scenes">Behind the Scenes</option>
                  <option value="event">Event</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tips"
                  checked={streamConfig.monetization?.tips_enabled}
                  onChange={(e) => setStreamConfig({
                    ...streamConfig,
                    monetization: { ...streamConfig.monetization!, tips_enabled: e.target.checked }
                  })}
                  className="mr-2"
                />
                <label htmlFor="tips" className="text-sm text-gray-700">
                  Enable tips during stream
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowStreamModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleStartStream}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Go Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};