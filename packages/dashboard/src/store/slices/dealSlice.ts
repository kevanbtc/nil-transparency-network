import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Deal {
  id: string;
  athleteId: string;
  athleteName: string;
  brandName: string;
  amount: number;
  status: string;
  platformSource: string;
  createdAt: string;
  complianceApproved: boolean;
}

interface DealState {
  deals: Deal[];
  selectedDeal: Deal | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: DealState = {
  deals: [],
  selectedDeal: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

export const dealSlice = createSlice({
  name: 'deals',
  initialState,
  reducers: {
    fetchDealsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDealsSuccess: (state, action: PayloadAction<{ deals: Deal[]; pagination: any }>) => {
      state.deals = action.payload.deals;
      state.pagination = action.payload.pagination;
      state.loading = false;
    },
    fetchDealsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    selectDeal: (state, action: PayloadAction<Deal>) => {
      state.selectedDeal = action.payload;
    },
    clearSelectedDeal: (state) => {
      state.selectedDeal = null;
    },
    updateDeal: (state, action: PayloadAction<Deal>) => {
      const index = state.deals.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.deals[index] = action.payload;
      }
      if (state.selectedDeal?.id === action.payload.id) {
        state.selectedDeal = action.payload;
      }
    },
    addDeal: (state, action: PayloadAction<Deal>) => {
      state.deals.unshift(action.payload);
    },
  },
});