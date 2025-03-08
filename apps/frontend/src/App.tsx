import React from 'react';
import { ChakraProvider, CSSReset, extendTheme, ThemeConfig } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadReceipt from './pages/UploadReceipt';
import Categories from './pages/Categories';
import Insights from './pages/Insights';
import ReceiptDetail from './pages/ReceiptDetail';

// Create a custom theme
const config: ThemeConfig = {
    initialColorMode: 'light',
    useSystemColorMode: false,
};

const theme = extendTheme({
    config,
    fonts: {
        heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
        body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
    },
    colors: {
        blue: {
            50: '#e6f1fe',
            100: '#cce3fd',
            200: '#99c7fb',
            300: '#66aaf9',
            400: '#338ef7',
            500: '#0072f5', // primary blue
            600: '#005bc4',
            700: '#004493',
            800: '#002e62',
            900: '#001731',
        },
        gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
        },
    },
    components: {
        Button: {
            baseStyle: {
                fontWeight: 'semibold',
                borderRadius: 'xl',
                _focus: {
                    boxShadow: 'none',
                },
            },
            variants: {
                solid: {
                    bg: 'blue.500',
                    color: 'white',
                    _hover: {
                        bg: 'blue.600',
                        _disabled: {
                            bg: 'blue.500',
                        },
                    },
                    _active: { bg: 'blue.700' },
                },
                outline: {
                    borderColor: 'gray.200',
                    color: 'gray.700',
                    _hover: {
                        bg: 'gray.50',
                    },
                },
            },
        },
        Card: {
            baseStyle: {
                container: {
                    borderRadius: 'xl',
                    overflow: 'hidden',
                },
            },
        },
        Input: {
            baseStyle: {
                field: {
                    borderRadius: 'lg',
                },
            },
            defaultProps: {
                focusBorderColor: 'blue.500',
            },
        },
        Select: {
            baseStyle: {
                field: {
                    borderRadius: 'lg',
                },
            },
            defaultProps: {
                focusBorderColor: 'blue.500',
            },
        },
        Tabs: {
            variants: {
                enclosed: {
                    tab: {
                        _selected: {
                            color: 'blue.500',
                        },
                        _focus: {
                            boxShadow: 'none',
                        },
                    },
                },
            },
        },
        Heading: {
            baseStyle: {
                fontWeight: '600',
            },
        },
        Badge: {
            baseStyle: {
                borderRadius: 'full',
                textTransform: 'normal',
                fontWeight: 'medium',
            },
        },
    },
    styles: {
        global: {
            body: {
                bg: 'gray.50',
                color: 'gray.800',
            },
        },
    },
});

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
            <ChakraProvider theme={theme}>
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