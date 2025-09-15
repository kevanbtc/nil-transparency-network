/**
 * SiloCloud Athlete Super-App
 * Main dashboard for athlete NIL vault control and engagement monetization
 */

import React, { useState, useEffect } from 'react';
import { SiloCloudNIL, AthleteProfile, NILDeal, StreamConfig } from '../silo-integration/SiloCloudNIL';
import { VaultOverview } from './components/VaultOverview';
import { DealsManager } from './components/DealsManager';
import { EngagementHub } from './components/EngagementHub';
import { ReputationScore } from './components/ReputationScore';
import { ComplianceCenter } from './components/ComplianceCenter';

interface AthleteSuperapAppProps {
  athleteId: string;
  siloCloud: SiloCloudNIL;
}

export const AthleteSuperapApp: React.FC<AthleteSuperapAppProps> = ({ athleteId, siloCloud }) => {
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const [vaultInfo, setVaultInfo] = useState<any>(null);
  const [activeDeals, setActiveDeals] = useState<NILDeal[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deals' | 'engage' | 'reputation' | 'compliance'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAthleteData();
  }, [athleteId]);

  const loadAthleteData = async () => {
    try {
      setLoading(true);
      const [profile, vault, deals] = await Promise.all([
        getAthleteProfile(),
        siloCloud.getAthleteVault(athleteId),
        getActiveDeals()
      ]);
      
      setAthleteProfile(profile);
      setVaultInfo(vault);
      setActiveDeals(deals);
    } catch (error) {
      console.error('Failed to load athlete data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAthleteProfile = async (): Promise<AthleteProfile> => {
    // Mock implementation - would fetch from SiloCloud API
    return {
      id: athleteId,
      name: "Jordan Mitchell",
      sport: "Basketball",
      school: "State University",
      vault_address: "0x1234...5678",
      eligibility_status: "active",
      kyc_status: "verified",
      social_handles: {
        twitter: "@jordanm_hoops",
        instagram: "@jordan.mitchell",
        tiktok: "@jordanm_sports"
      },
      nil_subdomain: "jordan.nil"
    };
  };

  const getActiveDeals = async (): Promise<NILDeal[]> => {
    // Mock implementation - would fetch from SiloCloud API
    return [
      {
        deal_id: "deal_001",
        athlete_id: athleteId,
        brand_name: "SportsCorp",
        brand_address: "0xbrand1",
        amount: 5000,
        currency: "USD",
        deliverables: ["Social media posts", "Appearance at event"],
        platform_source: "opendorse",
        status: "active",
        revenue_splits: {
          athlete: 70,
          school: 15,
          collective: 10,
          platform: 5
        },
        created_at: new Date(),
        compliance_approved: true
      }
    ];
  };

  const startLivestream = async (config: StreamConfig) => {
    try {
      const stream = await siloCloud.startLiveStream(athleteId, config);
      console.log('Stream started:', stream);
      // Update UI with stream info
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  const launchMerchDrop = async () => {
    try {
      const dropId = await siloCloud.createMerchDrop(athleteId, {
        items: [
          {
            name: "Signed Jersey",
            description: "Game-worn signed jersey from championship game",
            price: 150,
            currency: "USD",
            inventory: 25,
            images: ["/images/jersey-1.jpg"]
          }
        ],
        drop_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        exclusive_access: "subscribers"
      });
      console.log('Merch drop created:', dropId);
    } catch (error) {
      console.error('Failed to create merch drop:', error);
    }
  };

  const mintNFT = async () => {
    try {
      const tokenId = await siloCloud.mintAthleteNFT(athleteId, {
        name: "Championship Moment #1",
        description: "The winning shot from the championship game",
        image: "/images/championship-shot.jpg",
        attributes: [
          { trait_type: "Game", value: "Championship Final" },
          { trait_type: "Season", value: "2023-24" },
          { trait_type: "Rarity", value: "Legendary" }
        ],
        supply: 100,
        price: 50,
        currency: "USD"
      });
      console.log('NFT minted:', tokenId);
    } catch (error) {
      console.error('Failed to mint NFT:', error);
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
            <div className="flex items-center space-x-4">
              <img
                className="h-12 w-12 rounded-full object-cover"
                src="/images/athlete-avatar.jpg"
                alt={athleteProfile?.name}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{athleteProfile?.name}</h1>
                <p className="text-gray-500">{athleteProfile?.sport} • {athleteProfile?.school}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm text-gray-500">NIL Domain</p>
                <p className="font-semibold text-blue-600">{athleteProfile?.nil_subdomain}</p>
              </div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Vault Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {athleteProfile?.kyc_status === 'verified' ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
              { id: 'deals', label: 'NIL Deals', icon: '📋' },
              { id: 'engage', label: 'Engage', icon: '🎯' },
              { id: 'reputation', label: 'Reputation', icon: '⭐' },
              { id: 'compliance', label: 'Compliance', icon: '✅' }
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
          <VaultOverview
            vaultInfo={vaultInfo}
            deals={activeDeals}
            athleteProfile={athleteProfile}
          />
        )}

        {activeTab === 'deals' && (
          <DealsManager
            deals={activeDeals}
            onDealUpdate={loadAthleteData}
            siloCloud={siloCloud}
          />
        )}

        {activeTab === 'engage' && (
          <EngagementHub
            athleteId={athleteId}
            onStartStream={startLivestream}
            onLaunchMerch={launchMerchDrop}
            onMintNFT={mintNFT}
            siloCloud={siloCloud}
          />
        )}

        {activeTab === 'reputation' && (
          <ReputationScore
            athleteId={athleteId}
            siloCloud={siloCloud}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceCenter
            athleteId={athleteId}
            vaultAddress={vaultInfo?.address}
            siloCloud={siloCloud}
          />
        )}
      </main>
    </div>
  );
};

export default AthleteSuperapApp;