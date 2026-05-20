import React, { useMemo, ReactNode } from 'react';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { ShelbyClientProvider } from "@shelby-protocol/react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Network } from '@aptos-labs/ts-sdk';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CreateVault from './pages/CreateVault';
import Settings from './pages/Settings';
import Download from './pages/Download';
import Navbar from './components/Navbar';
import { Toaster } from 'react-hot-toast';
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";

const queryClient = new QueryClient();

const shelbyClient = new ShelbyClient({ 
  network: Network.TESTNET,
  apiKey: import.meta.env.VITE_SHELBY_API_KEY || import.meta.env.NEXT_PUBLIC_SHELBY_API_KEY || ''
});

// Simple ErrorBoundary component
export class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
            <p className="text-slate-400">The application encountered an unexpected error. Please refresh the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const wallets = useMemo(() => [new PetraWallet()], []);

  return (
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider client={shelbyClient}>
        <AptosWalletAdapterProvider 
          {...({ wallets } as any)} 
          autoConnect={true}
          dappConfig={{ network: Network.TESTNET }}
        >
          <Router>
            <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden w-full">
              <Navbar />
              <main className="container mx-auto px-4 py-6 sm:py-8 w-full overflow-x-hidden">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/create" element={<CreateVault />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/download/:account/:blobName" element={<Download />} />
                </Routes>
              </main>
              <Toaster position="bottom-right" />
            </div>
          </Router>
        </AptosWalletAdapterProvider>
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}

export default App;
