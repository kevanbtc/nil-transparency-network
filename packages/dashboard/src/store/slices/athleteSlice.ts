import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Athlete {
  id: string;
  name: string;
  sport: string;
  school: string;
  vaultAddress: string;
  eligibilityStatus: string;
  kycStatus: string;
  totalEarnings: number;
  activeDeals: number;
}

interface AthleteState {
  athletes: Athlete[];
  selectedAthlete: Athlete | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: AthleteState = {
  athletes: [],
  selectedAthlete: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

export const athleteSlice = createSlice({
  name: 'athletes',
  initialState,
  reducers: {
    fetchAthletesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchAthletesSuccess: (state, action: PayloadAction<{ athletes: Athlete[]; pagination: any }>) => {
      state.athletes = action.payload.athletes;
      state.pagination = action.payload.pagination;
      state.loading = false;
    },
    fetchAthletesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    selectAthlete: (state, action: PayloadAction<Athlete>) => {
      state.selectedAthlete = action.payload;
    },
    clearSelectedAthlete: (state) => {
      state.selectedAthlete = null;
    },
    updateAthlete: (state, action: PayloadAction<Athlete>) => {
      const index = state.athletes.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.athletes[index] = action.payload;
      }
      if (state.selectedAthlete?.id === action.payload.id) {
        state.selectedAthlete = action.payload;
      }
    },
  },
});