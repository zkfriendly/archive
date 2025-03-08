import { Box, Flex, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { FiHome, FiUpload, FiFolder, FiPieChart } from 'react-icons/fi';

interface NavItemProps {
    to: string;
    icon: React.ReactElement;
    children: React.ReactNode;
    isActive: boolean;
}

const NavItem = ({ to, icon, children, isActive }: NavItemProps) => (
    <ChakraLink
        as={RouterLink}
        to={to}
        display="flex"
        alignItems="center"
        p={2}
        rounded="md"
        bg={isActive ? 'blue.100' : 'transparent'}
        color={isActive ? 'blue.700' : 'gray.700'}
        _hover={{
            textDecoration: 'none',
            bg: isActive ? 'blue.100' : 'gray.100',
        }}
    >
        <Box mr={3}>{icon}</Box>
        <Text>{children}</Text>
    </ChakraLink>
);

interface LayoutProps {
    children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const location = useLocation();

    return (
        <Flex minH="100vh">
            {/* Sidebar */}
            <Box
                w="250px"
                bg="white"
                borderRight="1px"
                borderColor="gray.200"
                p={4}
            >
                <Stack spacing={4}>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                        Expense Tracker
                    </Text>
                    <NavItem
                        to="/"
                        icon={<FiHome />}
                        isActive={location.pathname === '/'}
                    >
                        Dashboard
                    </NavItem>
                    <NavItem
                        to="/upload"
                        icon={<FiUpload />}
                        isActive={location.pathname === '/upload'}
                    >
                        Upload Receipt
                    </NavItem>
                    <NavItem
                        to="/categories"
                        icon={<FiFolder />}
                        isActive={location.pathname === '/categories'}
                    >
                        Categories
                    </NavItem>
                    <NavItem
                        to="/insights"
                        icon={<FiPieChart />}
                        isActive={location.pathname === '/insights'}
                    >
                        Insights
                    </NavItem>
                </Stack>
            </Box>

            {/* Main content */}
            <Box flex={1} p={8} bg="gray.50">
                {children}
            </Box>
        </Flex>
    );
};

export default Layout; 