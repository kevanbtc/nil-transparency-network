import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './slices/authSlice';
import { athleteSlice } from './slices/athleteSlice';
import { dealSlice } from './slices/dealSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    athletes: athleteSlice.reducer,
    deals: dealSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;