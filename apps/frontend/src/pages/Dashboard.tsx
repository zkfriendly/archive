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
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

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
}

const Dashboard = () => {
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

    return (
        <VStack spacing={8} align="stretch">
            <Heading>Dashboard</Heading>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Total Expenses</StatLabel>
                            <StatNumber>${stats.total.toFixed(2)}</StatNumber>
                            <StatHelpText>All time</StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Average Receipt</StatLabel>
                            <StatNumber>${stats.average.toFixed(2)}</StatNumber>
                            <StatHelpText>Per receipt</StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Total Receipts</StatLabel>
                            <StatNumber>{stats.count}</StatNumber>
                            <StatHelpText>Processed</StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>
            </SimpleGrid>

            <Box>
                <Heading size="md" mb={4}>Recent Receipts</Heading>
                {isLoading ? (
                    <Text>Loading...</Text>
                ) : (
                    <Card>
                        <CardBody>
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Date</Th>
                                        <Th>Items</Th>
                                        <Th isNumeric>Total</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {receipts?.slice(0, 5).map((receipt) => (
                                        <Tr key={receipt.id}>
                                            <Td>{new Date(receipt.date).toLocaleDateString()}</Td>
                                            <Td>{receipt.items.length} items</Td>
                                            <Td isNumeric>${receipt.totalAmount.toFixed(2)}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </CardBody>
                    </Card>
                )}
            </Box>
        </VStack>
    );
};

export default Dashboard; 