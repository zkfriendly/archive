import React from 'react';
import {
    Box,
    Flex,
    Link as ChakraLink,
    Stack,
    Text,
    IconButton,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    useDisclosure,
    HStack,
    Button,
    Container,
    useColorModeValue,
    Avatar,
    Heading,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Divider,
    Image,
    Badge,
    Tooltip,
    useBreakpointValue,
    VStack,
    Icon,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
    FiHome,
    FiUpload,
    FiFolder,
    FiPieChart,
    FiMenu,
    FiPlus,
    FiUser,
    FiSettings,
    FiLogOut,
    FiChevronDown,
    FiDollarSign,
    FiBell,
    FiSearch
} from 'react-icons/fi';

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
        p={3}
        mx={2}
        rounded="xl"
        bg={isActive ? 'blue.50' : 'transparent'}
        color={isActive ? 'blue.600' : 'gray.600'}
        fontWeight={isActive ? 'semibold' : 'medium'}
        _hover={{
            textDecoration: 'none',
            bg: isActive ? 'blue.50' : 'gray.50',
            color: isActive ? 'blue.600' : 'gray.800',
        }}
        transition="all 0.2s"
    >
        <Box mr={3} fontSize="lg" color={isActive ? 'blue.500' : 'gray.500'}>
            {icon}
        </Box>
        <Text>{children}</Text>
        {isActive && (
            <Box ml="auto" w="4px" h="24px" bg="blue.500" borderRadius="full" />
        )}
    </ChakraLink>
);

interface LayoutProps {
    children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.100', 'gray.700');
    const isMobile = useBreakpointValue({ base: true, md: false });

    const handleNewReceipt = () => {
        navigate('/upload');
        if (isMobile && isOpen) {
            onClose();
        }
    };

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
            {/* Sidebar - desktop */}
            <Box
                display={{ base: 'none', md: 'block' }}
                w="280px"
                bg={bgColor}
                boxShadow="sm"
                position="fixed"
                h="100vh"
                borderRight="1px"
                borderColor={borderColor}
                zIndex="1000"
            >
                <Flex direction="column" h="full">
                    <Box p={6}>
                        <HStack spacing={3} mb={8}>
                            <Box
                                bg="blue.500"
                                w="36px"
                                h="36px"
                                borderRadius="lg"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Icon as={FiDollarSign} color="white" boxSize={5} />
                            </Box>
                            <Heading size="md" fontWeight="bold">
                                Expense<Text as="span" color="blue.500">Tracker</Text>
                            </Heading>
                        </HStack>

                        <Button
                            onClick={handleNewReceipt}
                            colorScheme="blue"
                            leftIcon={<FiPlus />}
                            size="md"
                            w="full"
                            h="48px"
                            mb={8}
                            boxShadow="md"
                            borderRadius="xl"
                        >
                            New Receipt
                        </Button>
                    </Box>

                    <VStack spacing={1} align="stretch" flex={1} px={2}>
                        <Text px={4} mb={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                            Main
                        </Text>
                        <NavItem
                            to="/"
                            icon={<FiHome />}
                            isActive={location.pathname === '/' || location.pathname === '/dashboard'}
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

                        <Box mt={8}>
                            <Text px={4} mb={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                                Account
                            </Text>
                            <NavItem
                                to="/settings"
                                icon={<FiSettings />}
                                isActive={location.pathname === '/settings'}
                            >
                                Settings
                            </NavItem>
                        </Box>
                    </VStack>

                    <Box p={4} mt="auto">
                        <Flex
                            p={3}
                            borderRadius="xl"
                            bg="gray.50"
                            align="center"
                            _hover={{ bg: 'gray.100' }}
                            cursor="pointer"
                        >
                            <Avatar size="sm" name="User" bg="blue.500" />
                            <Box ml={3}>
                                <Text fontWeight="medium" fontSize="sm">John Doe</Text>
                                <Text fontSize="xs" color="gray.500">john@example.com</Text>
                            </Box>
                            <Box ml="auto">
                                <Icon as={FiChevronDown} color="gray.400" />
                            </Box>
                        </Flex>
                    </Box>
                </Flex>
            </Box>

            {/* Header - mobile */}
            <Box
                as="header"
                position="fixed"
                w="full"
                bg={bgColor}
                boxShadow="sm"
                zIndex="1000"
                display={{ base: 'block', md: 'none' }}
            >
                <Flex justify="space-between" align="center" h="16" px={4}>
                    <HStack spacing={3}>
                        <IconButton
                            onClick={onOpen}
                            variant="ghost"
                            aria-label="open menu"
                            icon={<FiMenu />}
                        />
                        <HStack spacing={2}>
                            <Box
                                bg="blue.500"
                                w="32px"
                                h="32px"
                                borderRadius="lg"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Icon as={FiDollarSign} color="white" boxSize={4} />
                            </Box>
                            <Heading size="sm" fontWeight="bold">
                                ExpenseTracker
                            </Heading>
                        </HStack>
                    </HStack>

                    <HStack spacing={3}>
                        <IconButton
                            aria-label="Notifications"
                            icon={<FiBell />}
                            variant="ghost"
                            size="sm"
                        />
                        <Avatar size="sm" name="User" bg="blue.500" />
                    </HStack>
                </Flex>
            </Box>

            {/* Sidebar - mobile */}
            <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="full">
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerHeader borderBottomWidth="1px" px={6} py={8}>
                        <Flex justify="space-between" align="center">
                            <HStack spacing={3}>
                                <Box
                                    bg="blue.500"
                                    w="36px"
                                    h="36px"
                                    borderRadius="lg"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Icon as={FiDollarSign} color="white" boxSize={5} />
                                </Box>
                                <Heading size="md" fontWeight="bold">
                                    Expense<Text as="span" color="blue.500">Tracker</Text>
                                </Heading>
                            </HStack>
                            <DrawerCloseButton position="static" />
                        </Flex>
                    </DrawerHeader>
                    <DrawerBody p={0}>
                        <Box p={6}>
                            <Button
                                onClick={handleNewReceipt}
                                colorScheme="blue"
                                leftIcon={<FiPlus />}
                                size="md"
                                w="full"
                                h="48px"
                                mb={8}
                                boxShadow="md"
                                borderRadius="xl"
                            >
                                New Receipt
                            </Button>
                        </Box>

                        <VStack spacing={1} align="stretch" px={4}>
                            <Text px={4} mb={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                                Main
                            </Text>
                            <NavItem
                                to="/"
                                icon={<FiHome />}
                                isActive={location.pathname === '/' || location.pathname === '/dashboard'}
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

                            <Box mt={8}>
                                <Text px={4} mb={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                                    Account
                                </Text>
                                <NavItem
                                    to="/settings"
                                    icon={<FiSettings />}
                                    isActive={location.pathname === '/settings'}
                                >
                                    Settings
                                </NavItem>
                            </Box>
                        </VStack>

                        <Box p={6} mt={8}>
                            <Flex
                                p={3}
                                borderRadius="xl"
                                bg="gray.50"
                                align="center"
                                _hover={{ bg: 'gray.100' }}
                                cursor="pointer"
                            >
                                <Avatar size="sm" name="User" bg="blue.500" />
                                <Box ml={3}>
                                    <Text fontWeight="medium" fontSize="sm">John Doe</Text>
                                    <Text fontSize="xs" color="gray.500">john@example.com</Text>
                                </Box>
                                <Box ml="auto">
                                    <Icon as={FiChevronDown} color="gray.400" />
                                </Box>
                            </Flex>
                        </Box>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            {/* Main content */}
            <Box
                ml={{ base: 0, md: '280px' }}
                pt={{ base: '64px', md: 0 }}
                transition=".3s ease"
            >
                <Box p={{ base: 4, md: 8 }} maxW="1600px" mx="auto">
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

export default Layout; 