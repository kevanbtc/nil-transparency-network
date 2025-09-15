/**
 * University Portal - NIL Transparency Network
 * Compliance dashboard for universities to monitor NIL activities
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
  TabsTrigger
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
interface UniversityData {
  id: string;
  name: string;
  totalAthletes: number;
  activeNILDeals: number;
  totalNILVolume: number;
  complianceScore: number;
  revenueShare: number;
}

interface AthleteOverview {
  id: string;
  name: string;
  sport: string;
  totalEarnings: number;
  activeDeals: number;
  complianceStatus: 'verified' | 'pending' | 'attention_required';
  lastActivity: Date;
}

interface ComplianceReport {
  reportId: string;
  period: string;
  totalDeals: number;
  compliantDeals: number;
  flaggedDeals: number;
  averageProcessingTime: number;
  riskScore: number;
  generatedAt: Date;
}

interface NILActivity {
  dealId: string;
  athleteName: string;
  brandName: string;
  amount: number;
  platform: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'completed';
  submittedAt: Date;
  reviewedAt?: Date;
  notes?: string;
}

interface RegulatoryAlert {
  id: string;
  type: 'rule_change' | 'compliance_issue' | 'deadline_reminder' | 'audit_request';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  dueDate?: Date;
  createdAt: Date;
}

export const UniversityPortal: React.FC = () => {
  // State management
  const [universityData, setUniversityData] = useState<UniversityData | null>(null);
  const [athletes, setAthletes] = useState<AthleteOverview[]>([]);
  const [nilActivity, setNilActivity] = useState<NILActivity[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [alerts, setAlerts] = useState<RegulatoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load university data on component mount
  useEffect(() => {
    loadUniversityData();
  }, []);

  const loadUniversityData = async () => {
    try {
      setLoading(true);
      
      const [
        universityInfo,
        athleteData,
        nilData,
        complianceData,
        alertData
      ] = await Promise.all([
        fetchUniversityInfo(),
        fetchAthleteOverview(),
        fetchNILActivity(),
        fetchComplianceReports(),
        fetchRegulatoryAlerts()
      ]);

      setUniversityData(universityInfo);
      setAthletes(athleteData);
      setNilActivity(nilData);
      setComplianceReports(complianceData);
      setAlerts(alertData);
    } catch (error) {
      console.error('Failed to load university data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dashboard components
  const ComplianceDashboard: React.FC = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
          <span className="text-2xl">👥</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{universityData?.totalAthletes || 0}</div>
          <p className="text-xs text-muted-foreground">
            Active in NIL programs
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active NIL Deals</CardTitle>
          <span className="text-2xl">📋</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{universityData?.activeNILDeals || 0}</div>
          <p className="text-xs text-muted-foreground">
            {nilActivity.filter(d => d.status === 'pending_review').length} pending review
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total NIL Volume</CardTitle>
          <span className="text-2xl">💰</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${universityData?.totalNILVolume.toLocaleString() || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            This academic year
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
          <span className="text-2xl">✅</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{universityData?.complianceScore || 0}/100</div>
          <p className="text-xs text-muted-foreground">
            Regulatory adherence
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const RegulatoryAlerts: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle>Regulatory Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert) => (
            <Alert key={alert.id} className={`border-l-4 ${
              alert.severity === 'critical' ? 'border-red-500' :
              alert.severity === 'high' ? 'border-orange-500' :
              alert.severity === 'medium' ? 'border-yellow-500' :
              'border-blue-500'
            }`}>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <strong>{alert.title}</strong>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'high' ? 'destructive' :
                        alert.severity === 'medium' ? 'secondary' :
                        'default'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.description}
                    </p>
                    {alert.dueDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {alert.dueDate.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {alert.actionRequired && (
                    <Button size="sm" variant="outline">
                      Take Action
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const AthleteOverviewTable: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle>Athlete Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {athletes.map((athlete) => (
            <div key={athlete.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{athlete.name}</h3>
                  <Badge variant="outline">{athlete.sport}</Badge>
                  <Badge variant={
                    athlete.complianceStatus === 'verified' ? 'default' :
                    athlete.complianceStatus === 'pending' ? 'secondary' :
                    'destructive'
                  }>
                    {athlete.complianceStatus}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {athlete.activeDeals} active deals • Last activity: {athlete.lastActivity.toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  ${athlete.totalEarnings.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total earnings</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const NILActivityReview: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle>NIL Activity Requiring Review</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {nilActivity.filter(activity => activity.status === 'pending_review').map((activity) => (
            <div key={activity.dealId} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{activity.athleteName}</h3>
                  <Badge variant="outline">{activity.platform}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Deal with {activity.brandName} • ${activity.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Submitted: {activity.submittedAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-green-600">
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="text-red-600">
                  Reject
                </Button>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const RevenueSharing: React.FC = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>University Revenue Share</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">
            {universityData?.revenueShare || 0}%
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Average percentage from NIL deals
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>This Month</span>
              <span>${(universityData?.totalNILVolume * (universityData?.revenueShare || 0) / 100 / 12).toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>This Year</span>
              <span>${(universityData?.totalNILVolume * (universityData?.revenueShare || 0) / 100).toLocaleString() || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Compliance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Deal Approval Rate</span>
              <span className="text-lg font-semibold">94.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Review Time</span>
              <span className="text-lg font-semibold">2.3 hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Audit Readiness</span>
              <span className="text-lg font-semibold">
                <Badge variant="default">Excellent</Badge>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const AutomatedReporting: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle>Automated Reporting</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-semibold mb-3">Recent Reports</h3>
            <div className="space-y-2">
              {complianceReports.slice(0, 3).map((report) => (
                <div key={report.reportId} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">{report.period} Compliance Report</div>
                    <div className="text-xs text-muted-foreground">
                      {report.compliantDeals}/{report.totalDeals} deals compliant
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Scheduled Reports</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Monthly NCAA Report</span>
                <span className="text-muted-foreground">Due in 5 days</span>
              </div>
              <div className="flex justify-between">
                <span>Quarterly Financial Summary</span>
                <span className="text-muted-foreground">Due in 12 days</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Compliance Audit</span>
                <span className="text-muted-foreground">Due in 45 days</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              Generate Custom Report
            </Button>
            <Button size="sm" variant="outline">
              Export Data
            </Button>
            <Button size="sm" variant="outline">
              Schedule Report
            </Button>
          </div>
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
          {universityData?.name || 'University'} NIL Portal
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">Export Dashboard</Button>
          <Button>Generate Report</Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="athletes">Athletes</TabsTrigger>
          <TabsTrigger value="activity">NIL Activity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <ComplianceDashboard />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <RegulatoryAlerts />
            </div>
            <div>
              <RevenueSharing />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="athletes" className="space-y-4">
          <AthleteOverviewTable />
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <NILActivityReview />
        </TabsContent>
        
        <TabsContent value="compliance" className="space-y-4">
          <RegulatoryAlerts />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <AutomatedReporting />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions for data fetching
async function fetchUniversityInfo(): Promise<UniversityData> {
  return {
    id: 'university_123',
    name: 'State University',
    totalAthletes: 245,
    activeNILDeals: 47,
    totalNILVolume: 2350000,
    complianceScore: 96,
    revenueShare: 15
  };
}

async function fetchAthleteOverview(): Promise<AthleteOverview[]> {
  return [
    {
      id: 'athlete_1',
      name: 'Jordan Thompson',
      sport: 'Basketball',
      totalEarnings: 45000,
      activeDeals: 3,
      complianceStatus: 'verified',
      lastActivity: new Date('2024-09-14')
    },
    {
      id: 'athlete_2',
      name: 'Sarah Martinez',
      sport: 'Soccer',
      totalEarnings: 28000,
      activeDeals: 2,
      complianceStatus: 'pending',
      lastActivity: new Date('2024-09-13')
    },
    {
      id: 'athlete_3',
      name: 'Mike Johnson',
      sport: 'Football',
      totalEarnings: 67000,
      activeDeals: 5,
      complianceStatus: 'attention_required',
      lastActivity: new Date('2024-09-12')
    }
  ];
}

async function fetchNILActivity(): Promise<NILActivity[]> {
  return [
    {
      dealId: 'deal_pending_1',
      athleteName: 'Jordan Thompson',
      brandName: 'Nike',
      amount: 10000,
      platform: 'Opendorse',
      status: 'pending_review',
      submittedAt: new Date('2024-09-14')
    },
    {
      dealId: 'deal_pending_2',
      athleteName: 'Sarah Martinez',
      brandName: 'Local Restaurant',
      amount: 2500,
      platform: 'INFLCR',
      status: 'pending_review',
      submittedAt: new Date('2024-09-13')
    }
  ];
}

async function fetchComplianceReports(): Promise<ComplianceReport[]> {
  return [
    {
      reportId: 'report_202409',
      period: 'September 2024',
      totalDeals: 23,
      compliantDeals: 22,
      flaggedDeals: 1,
      averageProcessingTime: 2.3,
      riskScore: 12,
      generatedAt: new Date('2024-09-01')
    }
  ];
}

async function fetchRegulatoryAlerts(): Promise<RegulatoryAlert[]> {
  return [
    {
      id: 'alert_1',
      type: 'deadline_reminder',
      title: 'Monthly NCAA Report Due',
      description: 'Submit monthly NIL activity report to NCAA compliance office',
      severity: 'medium',
      actionRequired: true,
      dueDate: new Date('2024-09-30'),
      createdAt: new Date('2024-09-15')
    },
    {
      id: 'alert_2',
      type: 'compliance_issue',
      title: 'Deal Requires Additional Review',
      description: 'High-value deal flagged for manual compliance review',
      severity: 'high',
      actionRequired: true,
      createdAt: new Date('2024-09-14')
    }
  ];
}

export default UniversityPortal;