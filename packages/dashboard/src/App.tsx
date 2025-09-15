import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Athletes } from './pages/Athletes';
import { Deals } from './pages/Deals';
import { Compliance } from './pages/Compliance';
import { Analytics } from './pages/Analytics';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/athletes" element={<Athletes />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </Layout>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;