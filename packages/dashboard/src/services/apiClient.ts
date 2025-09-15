import axios, { AxiosInstance, AxiosResponse } from 'axios';

class APIClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error);
      }
    );
  }

  // Athletes API
  async getAthletes(params?: any) {
    return this.api.get('/athletes', { params });
  }

  async getAthleteById(id: string) {
    return this.api.get(`/athletes/${id}`);
  }

  async createAthlete(data: any) {
    return this.api.post('/athletes', data);
  }

  async updateAthlete(id: string, data: any) {
    return this.api.put(`/athletes/${id}`, data);
  }

  async deleteAthlete(id: string) {
    return this.api.delete(`/athletes/${id}`);
  }

  async getAthleteVault(id: string) {
    return this.api.get(`/athletes/${id}/vault`);
  }

  async getAthleteDeals(id: string, params?: any) {
    return this.api.get(`/athletes/${id}/deals`, { params });
  }

  async getAthleteEarnings(id: string, period?: string) {
    return this.api.get(`/athletes/${id}/earnings`, { params: { period } });
  }

  // Deals API
  async getDeals(params?: any) {
    return this.api.get('/deals', { params });
  }

  async getDealById(id: string) {
    return this.api.get(`/deals/${id}`);
  }

  async createDeal(data: any) {
    return this.api.post('/deals', data);
  }

  async updateDeal(id: string, data: any) {
    return this.api.put(`/deals/${id}`, data);
  }

  async executeDeal(id: string) {
    return this.api.post(`/deals/${id}/execute`);
  }

  async getDealCompliance(id: string) {
    return this.api.get(`/deals/${id}/compliance`);
  }

  // Compliance API
  async getComplianceRecords(params?: any) {
    return this.api.get('/compliance/records', { params });
  }

  async verifyKYC(data: any) {
    return this.api.post('/compliance/kyc/verify', data);
  }

  async checkDealCompliance(data: any) {
    return this.api.post('/compliance/deal/check', data);
  }

  async checkSanctions(address: string) {
    return this.api.get(`/compliance/sanctions/${address}`);
  }

  async getComplianceThresholds() {
    return this.api.get('/compliance/thresholds');
  }

  async updateComplianceThresholds(data: any) {
    return this.api.put('/compliance/thresholds', data);
  }

  async generateComplianceReport(data: any) {
    return this.api.post('/compliance/reports/generate', data);
  }

  async getComplianceAnalytics(params?: any) {
    return this.api.get('/compliance/analytics', { params });
  }

  // Analytics API
  async getAnalyticsOverview(params?: any) {
    return this.api.get('/analytics/overview', { params });
  }

  async getAthleteAnalytics(params?: any) {
    return this.api.get('/analytics/athletes', { params });
  }

  async getDealAnalytics(params?: any) {
    return this.api.get('/analytics/deals', { params });
  }

  async getPlatformAnalytics(params?: any) {
    return this.api.get('/analytics/platforms', { params });
  }

  async getRevenueAnalytics(params?: any) {
    return this.api.get('/analytics/revenue', { params });
  }

  async getTrendAnalytics(params?: any) {
    return this.api.get('/analytics/trends', { params });
  }

  // Platforms API
  async getPlatforms() {
    return this.api.get('/platforms');
  }

  async createPlatform(data: any) {
    return this.api.post('/platforms', data);
  }

  async updatePlatform(id: string, data: any) {
    return this.api.put(`/platforms/${id}`, data);
  }

  async deletePlatform(id: string) {
    return this.api.delete(`/platforms/${id}`);
  }
}

export const apiClient = new APIClient();