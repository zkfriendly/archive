import React from 'react';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadReceipt from './pages/UploadReceipt';
import Categories from './pages/Categories';
import Insights from './pages/Insights';
import ReceiptDetail from './pages/ReceiptDetail';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
        },
    },
});

const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <ChakraProvider>
                <CSSReset />
                <Router>
                    <Layout>
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/upload" element={<UploadReceipt />} />
                            <Route path="/categories" element={<Categories />} />
                            <Route path="/insights" element={<Insights />} />
                            <Route path="/receipts/:id" element={<ReceiptDetail />} />
                        </Routes>
                    </Layout>
                </Router>
            </ChakraProvider>
        </QueryClientProvider>
    );
};

export default App; 