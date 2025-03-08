import React, { useState } from 'react';
import {
    Box,
    Grid,
    Heading,
    Text,
    VStack,
    SimpleGrid,
    Card,
    CardBody,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Button,
    HStack,
    Icon,
    Badge,
    Flex,
    useColorModeValue,
    Skeleton,
    SkeletonText,
    IconButton,
    Tooltip,
    Input,
    InputGroup,
    InputLeftElement,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Select,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Image,
    Divider,
    Stack,
    Progress,
    CircularProgress,
    CircularProgressLabel,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    FiArrowUp,
    FiArrowDown,
    FiDollarSign,
    FiShoppingBag,
    FiCalendar,
    FiCreditCard,
    FiPlus,
    FiSearch,
    FiFilter,
    FiChevronDown,
    FiMoreVertical,
    FiTrendingUp,
    FiPieChart,
    FiClock,
    FiTag,
    FiShoppingCart,
    FiEye,
    FiTrash2,
    FiSettings,
    FiUpload
} from 'react-icons/fi';

interface Receipt {
    id: string;
    date: string;
    totalAmount: number;
    items: Array<{
        id: string;
        name: string;
        price: number;
        category: {
            name: string;
        };
    }>;
    shop?: {
        id: string;
        name: string;
        address?: string;
    };
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [timeFilter, setTimeFilter] = useState('This Month');
    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.100', 'gray.600');
    const textColor = useColorModeValue('gray.600', 'gray.300');
    const headingColor = useColorModeValue('gray.800', 'white');
    const subheadingColor = useColorModeValue('gray.700', 'gray.100');
    const mutedColor = useColorModeValue('gray.500', 'gray.400');

    const { data: receipts, isLoading } = useQuery<Receipt[]>({
        queryKey: ['receipts'],
        queryFn: async () => {
            const response = await axios.get('/api/receipts');
            return response.data;
        },
    });

    const calculateStats = () => {
        if (!receipts) return { total: 0, average: 0, count: 0 };

        const total = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
        const count = receipts.length;
        const average = count > 0 ? total / count : 0;

        return { total, average, count };
    };

    const stats = calculateStats();

    // Calculate top categories
    const getTopCategories = () => {
        if (!receipts) return [];

        const categories: Record<string, number> = {};

        receipts.forEach(receipt => {
            receipt.items.forEach(item => {
                const categoryName = item.category?.name || 'Uncategorized';
                categories[categoryName] = (categories[categoryName] || 0) + item.price;
            });
        });

        return Object.entries(categories)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    };

    const topCategories = getTopCategories();

    // Calculate spending trend (mock data for now)
    const spendingTrend = [
        { month: 'Jan', amount: 1200 },
        { month: 'Feb', amount: 1400 },
        { month: 'Mar', amount: 1100 },
        { month: 'Apr', amount: 1600 },
        { month: 'May', amount: 1300 },
        { month: 'Jun', amount: 1500 },
    ];

    const maxSpending = Math.max(...spendingTrend.map(item => item.amount));

    return (
        <Box>
            <Flex direction="column" gap={8}>
                {/* Header section */}
                <Flex
                    justify="space-between"
                    align={{ base: "start", md: "center" }}
                    direction={{ base: "column", md: "row" }}
                    gap={{ base: 4, md: 0 }}
                >
                    <Box>
                        <Heading size="lg" color={headingColor} mb={1}>
                            Welcome back, John
                        </Heading>
                        <Text color={mutedColor}>
                            Here's what's happening with your expenses
                        </Text>
                    </Box>

                    <HStack spacing={4}>
                        <Menu>
                            <MenuButton
                                as={Button}
                                rightIcon={<FiChevronDown />}
                                variant="outline"
                                borderColor={borderColor}
                                size="md"
                            >
                                {timeFilter}
                            </MenuButton>
                            <MenuList>
                                <MenuItem onClick={() => setTimeFilter('Today')}>Today</MenuItem>
                                <MenuItem onClick={() => setTimeFilter('This Week')}>This Week</MenuItem>
                                <MenuItem onClick={() => setTimeFilter('This Month')}>This Month</MenuItem>
                                <MenuItem onClick={() => setTimeFilter('This Year')}>This Year</MenuItem>
                                <MenuItem onClick={() => setTimeFilter('All Time')}>All Time</MenuItem>
                            </MenuList>
                        </Menu>

                        <Button
                            leftIcon={<FiPlus />}
                            colorScheme="blue"
                            onClick={() => navigate('/upload')}
                        >
                            New Receipt
                        </Button>
                    </HStack>
                </Flex>

                {/* Stats cards */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                    <Card bg={cardBg} shadow="sm" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                        <CardBody p={6}>
                            <Flex justify="space-between" align="center">
                                <Box>
                                    <Text color={mutedColor} fontSize="sm" fontWeight="medium" mb={1}>
                                        Total Expenses
                                    </Text>
                                    <Heading size="lg" color={headingColor} mb={1}>
                                        ${stats.total.toFixed(2)}
                                    </Heading>
                                    <HStack spacing={1}>
                                        <Icon as={FiArrowUp} color="red.500" boxSize={3} />
                                        <Text fontSize="sm" color="red.500" fontWeight="medium">
                                            8.2%
                                        </Text>
                                        <Text fontSize="sm" color={mutedColor}>
                                            vs last {timeFilter.toLowerCase()}
                                        </Text>
                                    </HStack>
                                </Box>
                                <Box
                                    p={3}
                                    bg="blue.50"
                                    color="blue.500"
                                    borderRadius="xl"
                                >
                                    <Icon as={FiDollarSign} boxSize={6} />
                                </Box>
                            </Flex>
                        </CardBody>
                    </Card>

                    <Card bg={cardBg} shadow="sm" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                        <CardBody p={6}>
                            <Flex justify="space-between" align="center">
                                <Box>
                                    <Text color={mutedColor} fontSize="sm" fontWeight="medium" mb={1}>
                                        Average Receipt
                                    </Text>
                                    <Heading size="lg" color={headingColor} mb={1}>
                                        ${stats.average.toFixed(2)}
                                    </Heading>
                                    <HStack spacing={1}>
                                        <Icon as={FiArrowDown} color="green.500" boxSize={3} />
                                        <Text fontSize="sm" color="green.500" fontWeight="medium">
                                            3.1%
                                        </Text>
                                        <Text fontSize="sm" color={mutedColor}>
                                            vs last {timeFilter.toLowerCase()}
                                        </Text>
                                    </HStack>
                                </Box>
                                <Box
                                    p={3}
                                    bg="green.50"
                                    color="green.500"
                                    borderRadius="xl"
                                >
                                    <Icon as={FiCreditCard} boxSize={6} />
                                </Box>
                            </Flex>
                        </CardBody>
                    </Card>

                    <Card bg={cardBg} shadow="sm" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                        <CardBody p={6}>
                            <Flex justify="space-between" align="center">
                                <Box>
                                    <Text color={mutedColor} fontSize="sm" fontWeight="medium" mb={1}>
                                        Total Receipts
                                    </Text>
                                    <Heading size="lg" color={headingColor} mb={1}>
                                        {stats.count}
                                    </Heading>
                                    <HStack spacing={1}>
                                        <Icon as={FiArrowUp} color="red.500" boxSize={3} />
                                        <Text fontSize="sm" color="red.500" fontWeight="medium">
                                            12.5%
                                        </Text>
                                        <Text fontSize="sm" color={mutedColor}>
                                            vs last {timeFilter.toLowerCase()}
                                        </Text>
                                    </HStack>
                                </Box>
                                <Box
                                    p={3}
                                    bg="purple.50"
                                    color="purple.500"
                                    borderRadius="xl"
                                >
                                    <Icon as={FiShoppingBag} boxSize={6} />
                                </Box>
                            </Flex>
                        </CardBody>
                    </Card>

                    <Card bg={cardBg} shadow="sm" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                        <CardBody p={6}>
                            <Flex justify="space-between" align="center">
                                <Box>
                                    <Text color={mutedColor} fontSize="sm" fontWeight="medium" mb={1}>
                                        Budget Used
                                    </Text>
                                    <Heading size="lg" color={headingColor} mb={1}>
                                        68%
                                    </Heading>
                                    <HStack spacing={1}>
                                        <Text fontSize="sm" color={mutedColor}>
                                            $1,200 remaining
                                        </Text>
                                    </HStack>
                                </Box>
                                <CircularProgress value={68} color="blue.500" size="60px" thickness="8px">
                                    <CircularProgressLabel fontWeight="bold">68%</CircularProgressLabel>
                                </CircularProgress>
                            </Flex>
                        </CardBody>
                    </Card>
                </SimpleGrid>

                {/* Main content */}
                <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
                    {/* Left column */}
                    <VStack spacing={6} align="stretch">
                        {/* Recent transactions */}
                        <Card bg={cardBg} shadow="sm" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                            <CardBody p={0}>
                                <Flex p={6} justify="space-between" align="center">
                                    <Heading size="md" color={headingColor}>
                                        Recent Receipts
                                    </Heading>
                                    <HStack>
                                        <InputGroup size="sm" w="200px">
                                            <InputLeftElement pointerEvents="none">
                                                <Icon as={FiSearch} color={mutedColor} />
                                            </InputLeftElement>
                                            <Input placeholder="Search receipts" borderRadius="md" />
                                        </InputGroup>
                                        <IconButton
                                            aria-label="Filter"
                                            icon={<FiFilter />}
                                            variant="ghost"
                                            size="sm"
                                        />
                                    </HStack>
                                </Flex>

                                {isLoading ? (
                                    <Box p={6}>
                                        <SkeletonText noOfLines={5} spacing="4" />
                                    </Box>
                                ) : (
                                    <Box overflowX="auto">
                                        <Table variant="simple">
                                            <Thead bg={useColorModeValue('gray.50', 'gray.800')}>
                                                <Tr>
                                                    <Th>Date</Th>
                                                    <Th>Shop</Th>
                                                    <Th>Items</Th>
                                                    <Th isNumeric>Total</Th>
                                                    <Th>Actions</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {receipts?.slice(0, 5).map((receipt) => (
                                                    <Tr key={receipt.id} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                                                        <Td>
                                                            <HStack>
                                                                <Icon as={FiCalendar} color={mutedColor} />
                                                                <Text>{new Date(receipt.date).toLocaleDateString()}</Text>
                                                            </HStack>
                                                        </Td>
                                                        <Td>
                                                            <Badge colorScheme="blue" variant="subtle" px={2} py={1} borderRadius="md">
                                                                {receipt.shop?.name || "Unknown Shop"}
                                                            </Badge>
                                                        </Td>
                                                        <Td>{receipt.items.length} items</Td>
                                                        <Td isNumeric fontWeight="semibold">
                                                            ${receipt.totalAmount.toFixed(2)}
                                                        </Td>
                                                        <Td>
                                                            <HStack spacing={2}>
                                                                <Tooltip label="View details">
                                                                    <IconButton
                                                                        as={Link}
                                                                        to={`/receipts/${receipt.id}`}
                                                                        size="sm"
                                                                        colorScheme="blue"
                                                                        variant="ghost"
                                                                        aria-label="View details"
                                                                        icon={<FiEye />}
                                                                    />
                                                                </Tooltip>
                                                                <Menu>
                                                                    <MenuButton
                                                                        as={IconButton}
                                                                        aria-label="Options"
                                                                        icon={<FiMoreVertical />}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                    />
                                                                    <MenuList>
                                                                        <MenuItem icon={<FiEye />}>View Details</MenuItem>
                                                                        <MenuItem icon={<FiTag />}>Edit Categories</MenuItem>
                                                                        <MenuItem icon={<FiTrash2 />} color="red.500">Delete</MenuItem>
                                                                    </MenuList>
                                                                </Menu>
                                                            </HStack>
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>

                                        <Flex p={6} justify="center">
                                            <Button
                                                as={Link}
                                                to="/receipts"
                                                variant="outline"
                                                colorScheme="blue"
                                                size="sm"
                                                rightIcon={<FiChevronDown />}
                                            >
                                                View All Receipts
                                            </Button>
                                        </Flex>
                                    </Box>
                                )}
                            </CardBody>
                        </Card>

                        {/* Spending trend */}
                        <Card bg={cardBg} shadow="sm" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                            <CardBody p={6}>
                                <Flex justify="space-between" align="center" mb={6}>
                                    <Box>
                                        <Heading size="md" color={headingColor} mb={1}>
                                            Spending Trend
                                        </Heading>
                                        <Text color={mutedColor} fontSize="sm">
                                            How your spending has changed over time
                                        </Text>
                                    </Box>
                                    <HStack>
                                        <Select
                                            size="sm"
                                            w="150px"
                                            defaultValue="6months"
                                            borderRadius="md"
                                        >
                                            <option value="30days">Last 30 days</option>
                                            <option value="3months">Last 3 months</option>
                                            <option value="6months">Last 6 months</option>
                                            <option value="1year">Last year</option>
                                        </Select>
                                    </HStack>
                                </Flex>

                                <Box h="250px" position="relative">
                                    <Flex h="200px" align="flex-end" justify="space-between">
                                        {spendingTrend.map((item, index) => (
                                            <VStack key={index} spacing={2} w="full">
                                                <Box
                                                    h={`${(item.amount / maxSpending) * 180}px`}
                                                    w="24px"
                                                    bg="blue.400"
                                                    borderRadius="md"
                                                    position="relative"
                                                    _hover={{
                                                        bg: "blue.500",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <Tooltip
                                                        label={`$${item.amount}`}
                                                        placement="top"
                                                        hasArrow
                                                    >
                                                        <Box w="full" h="full" />
                                                    </Tooltip>
                                                </Box>
                                                <Text fontSize="xs" color={mutedColor}>
                                                    {item.month}
                                                </Text>
                                            </VStack>
                                        ))}
                                    </Flex>
                                </Box>
                            </CardBody>
                        </Card>
                    </VStack>

                    {/* Right column */}
                    <VStack spacing={6} align="stretch">
                        {/* Top categories */}
                        <Card bg={cardBg} shadow="sm" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                            <CardBody p={6}>
                                <Flex justify="space-between" align="center" mb={6}>
                                    <Box>
                                        <Heading size="md" color={headingColor} mb={1}>
                                            Top Categories
                                        </Heading>
                                        <Text color={mutedColor} fontSize="sm">
                                            Where you spend the most
                                        </Text>
                                    </Box>
                                    <IconButton
                                        aria-label="More options"
                                        icon={<FiMoreVertical />}
                                        variant="ghost"
                                        size="sm"
                                    />
                                </Flex>

                                <VStack spacing={4} align="stretch">
                                    {topCategories.map((category, index) => {
                                        const colors = [
                                            { bg: 'blue.50', color: 'blue.500', icon: FiShoppingCart },
                                            { bg: 'green.50', color: 'green.500', icon: FiDollarSign },
                                            { bg: 'purple.50', color: 'purple.500', icon: FiShoppingBag },
                                            { bg: 'orange.50', color: 'orange.500', icon: FiCreditCard },
                                            { bg: 'red.50', color: 'red.500', icon: FiTag },
                                        ];

                                        const colorSet = colors[index % colors.length];
                                        const percentage = Math.round((category.amount / stats.total) * 100);

                                        return (
                                            <Box key={index}>
                                                <Flex justify="space-between" align="center" mb={2}>
                                                    <HStack>
                                                        <Box
                                                            p={2}
                                                            bg={colorSet.bg}
                                                            color={colorSet.color}
                                                            borderRadius="lg"
                                                        >
                                                            <Icon as={colorSet.icon} boxSize={4} />
                                                        </Box>
                                                        <Text fontWeight="medium" color={subheadingColor}>
                                                            {category.name}
                                                        </Text>
                                                    </HStack>
                                                    <Text fontWeight="semibold" color={headingColor}>
                                                        ${category.amount.toFixed(2)}
                                                    </Text>
                                                </Flex>
                                                <Flex align="center">
                                                    <Progress
                                                        value={percentage}
                                                        size="sm"
                                                        colorScheme={colorSet.color.split('.')[0]}
                                                        flex={1}
                                                        borderRadius="full"
                                                        mr={2}
                                                    />
                                                    <Text fontSize="xs" color={mutedColor} fontWeight="medium">
                                                        {percentage}%
                                                    </Text>
                                                </Flex>
                                            </Box>
                                        );
                                    })}
                                </VStack>

                                <Button
                                    as={Link}
                                    to="/categories"
                                    variant="ghost"
                                    colorScheme="blue"
                                    size="sm"
                                    w="full"
                                    mt={6}
                                >
                                    View All Categories
                                </Button>
                            </CardBody>
                        </Card>

                        {/* Quick actions */}
                        <Card bg={cardBg} shadow="sm" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                            <CardBody p={6}>
                                <Heading size="md" color={headingColor} mb={4}>
                                    Quick Actions
                                </Heading>

                                <SimpleGrid columns={2} spacing={4}>
                                    <Button
                                        as={Link}
                                        to="/upload"
                                        colorScheme="blue"
                                        variant="outline"
                                        h="80px"
                                        borderRadius="xl"
                                        flexDirection="column"
                                        justifyContent="center"
                                    >
                                        <Icon as={FiUpload} boxSize={5} mb={2} />
                                        <Text fontSize="sm">Upload Receipt</Text>
                                    </Button>

                                    <Button
                                        as={Link}
                                        to="/insights"
                                        colorScheme="purple"
                                        variant="outline"
                                        h="80px"
                                        borderRadius="xl"
                                        flexDirection="column"
                                        justifyContent="center"
                                    >
                                        <Icon as={FiPieChart} boxSize={5} mb={2} />
                                        <Text fontSize="sm">View Insights</Text>
                                    </Button>

                                    <Button
                                        as={Link}
                                        to="/categories"
                                        colorScheme="green"
                                        variant="outline"
                                        h="80px"
                                        borderRadius="xl"
                                        flexDirection="column"
                                        justifyContent="center"
                                    >
                                        <Icon as={FiTag} boxSize={5} mb={2} />
                                        <Text fontSize="sm">Manage Categories</Text>
                                    </Button>

                                    <Button
                                        as={Link}
                                        to="/settings"
                                        colorScheme="orange"
                                        variant="outline"
                                        h="80px"
                                        borderRadius="xl"
                                        flexDirection="column"
                                        justifyContent="center"
                                    >
                                        <Icon as={FiSettings} boxSize={5} mb={2} />
                                        <Text fontSize="sm">Settings</Text>
                                    </Button>
                                </SimpleGrid>
                            </CardBody>
                        </Card>
                    </VStack>
                </Grid>
            </Flex>
        </Box>
    );
};

export default Dashboard; 