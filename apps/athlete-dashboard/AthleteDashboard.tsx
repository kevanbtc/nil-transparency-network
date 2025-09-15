/**
 * Athlete Dashboard - NIL Transparency Network
 * Main dashboard component for athletes to manage their NIL activities
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsToken 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Types
interface AthleteProfile {
  id: string;
  name: string;
  sport: string;
  school: string;
  vaultAddress: string;
  totalEarnings: number;
  activeDeals: number;
  complianceStatus: 'verified' | 'pending' | 'required';
  reputationScore: number;
}

interface NILDeal {
  id: string;
  brandName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'active' | 'completed' | 'rejected';
  deliverables: string[];
  platform: string;
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  complianceApproved: boolean;
}

interface VaultBalance {
  totalBalance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
}

interface EngagementMetrics {
  totalFollowers: number;
  engagementRate: number;
  contentPerformance: {
    posts: number;
    avgLikes: number;
    avgComments: number;
    topContent: string[];
  };
}

export const AthleteDashboard: React.FC = () => {
  // State management
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [deals, setDeals] = useState<NILDeal[]>([]);
  const [balance, setBalance] = useState<VaultBalance | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Load athlete data on component mount
  useEffect(() => {
    loadAthleteData();
  }, []);

  const loadAthleteData = async () => {
    try {
      setLoading(true);
      
      // Fetch athlete profile, deals, and metrics
      const [profileData, dealsData, balanceData, engagementData] = await Promise.all([
        fetchAthleteProfile(),
        fetchAthleteDeals(),
        fetchVaultBalance(),
        fetchEngagementMetrics()
      ]);

      setProfile(profileData);
      setDeals(dealsData);
      setBalance(balanceData);
      setEngagement(engagementData);
    } catch (error) {
      console.error('Failed to load athlete data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dashboard components
  const VaultOverview: React.FC = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          <span className="text-2xl">💰</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${balance?.totalBalance.toLocaleString() || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            +{profile?.totalEarnings || 0} from last month
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
          <span className="text-2xl">📋</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{profile?.activeDeals || 0}</div>
          <p className="text-xs text-muted-foreground">
            {deals.filter(d => d.status === 'pending').length} pending approval
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reputation Score</CardTitle>
          <span className="text-2xl">⭐</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{profile?.reputationScore || 0}/100</div>
          <p className="text-xs text-muted-foreground">
            Based on performance & compliance
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
          <span className="text-2xl">✅</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <Badge variant={profile?.complianceStatus === 'verified' ? 'default' : 'destructive'}>
              {profile?.complianceStatus || 'Unknown'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            All systems compliant
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const DealsManager: React.FC = () => (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>NIL Deals Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deals.map((deal) => (
            <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{deal.brandName}</h3>
                  <Badge variant={deal.status === 'completed' ? 'default' : 'secondary'}>
                    {deal.status}
                  </Badge>
                  <Badge variant="outline">{deal.platform}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {deal.deliverables.join(', ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {deal.createdAt.toLocaleDateString()}
                  {deal.dueDate && ` • Due: ${deal.dueDate.toLocaleDateString()}`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  ${deal.amount.toLocaleString()} {deal.currency}
                </div>
                {deal.status === 'pending' && (
                  <Button size="sm" className="mt-2">
                    Review Deal
                  </Button>
                )}
                {deal.status === 'active' && (
                  <Button size="sm" variant="outline" className="mt-2">
                    View Progress
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const SiloCloudIntegration: React.FC = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Content Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Followers</span>
              <span className="text-lg font-semibold">
                {engagement?.totalFollowers.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Engagement Rate</span>
              <span className="text-lg font-semibold">
                {engagement?.engagementRate || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Posts This Month</span>
              <span className="text-lg font-semibold">
                {engagement?.contentPerformance.posts || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Monetization Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button className="w-full" variant="outline">
              Start Live Stream
            </Button>
            <Button className="w-full" variant="outline">
              Create Merch Drop
            </Button>
            <Button className="w-full" variant="outline">
              Mint NFT Collection
            </Button>
            <Button className="w-full" variant="outline">
              Fan Engagement Hub
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ComplianceCenter: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle>Compliance & Documentation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-semibold mb-3">Compliance Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">KYC Verification</span>
                <Badge variant="default">Verified</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Tax Documentation</span>
                <Badge variant="default">Complete</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">NCAA Eligibility</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">School Compliance</span>
                <Badge variant="default">Approved</Badge>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Recent Activity</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Compliance check completed</span>
                <span className="text-muted-foreground">2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span>Tax document updated</span>
                <span className="text-muted-foreground">1 day ago</span>
              </div>
              <div className="flex justify-between">
                <span>Deal approved by school</span>
                <span className="text-muted-foreground">3 days ago</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              Download Tax Forms
            </Button>
            <Button size="sm" variant="outline">
              Generate Report
            </Button>
            <Button size="sm" variant="outline">
              Update Documents
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TransactionHistory: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Mock transaction data */}
          {[
            { date: '2024-09-15', type: 'Deal Payment', amount: 5000, status: 'completed' },
            { date: '2024-09-14', type: 'Content Reward', amount: 250, status: 'completed' },
            { date: '2024-09-13', type: 'Fan Tip', amount: 50, status: 'completed' },
            { date: '2024-09-12', type: 'Merch Sale', amount: 125, status: 'pending' }
          ].map((tx, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{tx.type}</div>
                <div className="text-sm text-muted-foreground">{tx.date}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">+${tx.amount}</div>
                <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                  {tx.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.name || 'Athlete'}!
        </h2>
        <div className="flex items-center space-x-2">
          <Button>Connect Wallet</Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsToken value="overview">Overview</TabsToken>
          <TabsToken value="deals">NIL Deals</TabsToken>
          <TabsToken value="content">Content & Engagement</TabsToken>
          <TabsToken value="compliance">Compliance</TabsToken>
          <TabsToken value="transactions">Transactions</TabsToken>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <VaultOverview />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <DealsManager />
          </div>
        </TabsContent>
        
        <TabsContent value="deals" className="space-y-4">
          <DealsManager />
        </TabsContent>
        
        <TabsContent value="content" className="space-y-4">
          <SiloCloudIntegration />
        </TabsContent>
        
        <TabsContent value="compliance" className="space-y-4">
          <ComplianceCenter />
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions for data fetching
async function fetchAthleteProfile(): Promise<AthleteProfile> {
  // Mock implementation - would call actual API
  return {
    id: 'athlete_123',
    name: 'Jordan Thompson',
    sport: 'Basketball',
    school: 'State University',
    vaultAddress: '0x1234567890123456789012345678901234567890',
    totalEarnings: 45000,
    activeDeals: 3,
    complianceStatus: 'verified',
    reputationScore: 87
  };
}

async function fetchAthleteDeals(): Promise<NILDeal[]> {
  // Mock implementation - would call actual API
  return [
    {
      id: 'deal_1',
      brandName: 'Nike',
      amount: 10000,
      currency: 'USD',
      status: 'active',
      deliverables: ['Instagram posts (3)', 'Appearance at event'],
      platform: 'Opendorse',
      createdAt: new Date('2024-09-01'),
      dueDate: new Date('2024-10-01'),
      complianceApproved: true
    },
    {
      id: 'deal_2',
      brandName: 'Local Restaurant',
      amount: 2500,
      currency: 'USD',
      status: 'pending',
      deliverables: ['TikTok video', 'Story posts'],
      platform: 'INFLCR',
      createdAt: new Date('2024-09-10'),
      complianceApproved: false
    }
  ];
}

async function fetchVaultBalance(): Promise<VaultBalance> {
  // Mock implementation - would call blockchain/API
  return {
    totalBalance: 47500,
    availableBalance: 45000,
    pendingBalance: 2500,
    currency: 'USD'
  };
}

async function fetchEngagementMetrics(): Promise<EngagementMetrics> {
  // Mock implementation - would call INFLCR API
  return {
    totalFollowers: 125000,
    engagementRate: 4.2,
    contentPerformance: {
      posts: 28,
      avgLikes: 3500,
      avgComments: 180,
      topContent: ['workout_video_1', 'game_highlight_2']
    }
  };
}

export default AthleteDashboard;