// API wrapper for Meta/Facebook API calls
import { fetchWithAuth } from './apiClient.js';

export const metaApi = {
  async getAdAccounts() {
    try {
      const response = await fetchWithAuth('/api/ad-accounts');
      return response || [];
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      throw error;
    }
  },

  async getCampaigns(adAccountId, limit = 25) {
    try {
      const response = await fetchWithAuth(`/api/campaigns?ad_account_id=${adAccountId}&limit=${limit}`);
      return response || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }
};

export const insightsApi = {
  async getMetricsBreakdown(adAccountId, breakdown = 'day', params = {}) {
    try {
      const queryParams = new URLSearchParams({
        ad_account_id: adAccountId,
        breakdown,
        ...params
      });
      
      const response = await fetchWithAuth(`/api/meta/insights?${queryParams}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching metrics breakdown:', error);
      throw error;
    }
  }
};