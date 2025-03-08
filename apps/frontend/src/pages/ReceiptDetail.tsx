import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    Box,
    Heading,
    Text,
    VStack,
    HStack,
    Badge,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Image,
    Card,
    CardBody,
    Button,
    Flex,
    Spinner,
    useToast,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

interface Item {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: {
        id: string;
        name: string;
    };
}

interface Shop {
    id: string;
    name: string;
    address?: string;
}

interface Receipt {
    id: string;
    date: string;
    totalAmount: number;
    imageUrl: string;
    rawImagePath: string;
    items: Item[];
    shop?: Shop;
}

const ReceiptDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const toast = useToast();

    const { data: receipt, isLoading, error } = useQuery<Receipt>({
        queryKey: ['receipt', id],
        queryFn: async () => {
            const response = await axios.get(`/api/receipts/${id}`);
            return response.data;
        },
    });

    if (isLoading) {
        return (
            <Flex justify="center" align="center" h="300px">
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (error || !receipt) {
        return (
            <Box textAlign="center" py={10}>
                <Heading size="md">Error loading receipt</Heading>
                <Text mt={4}>Could not load the receipt details</Text>
                <Button as={Link} to="/dashboard" mt={6} colorScheme="blue">
                    Back to Dashboard
                </Button>
            </Box>
        );
    }

    // Type assertion to help TypeScript understand the data structure
    const receiptData = receipt as Receipt;

    return (
        <VStack spacing={6} align="stretch">
            <Flex justify="space-between" align="center">
                <Heading size="lg">Receipt Details</Heading>
                <Button as={Link} to="/dashboard" size="sm" colorScheme="blue">
                    Back to Dashboard
                </Button>
            </Flex>

            <Card>
                <CardBody>
                    <HStack spacing={6} align="flex-start">
                        <Box flex="1">
                            <VStack align="stretch" spacing={4}>
                                <Box>
                                    <Text fontWeight="bold">Date</Text>
                                    <Text>{new Date(receiptData.date).toLocaleDateString()}</Text>
                                </Box>

                                <Box>
                                    <Text fontWeight="bold">Total Amount</Text>
                                    <Text fontSize="xl" fontWeight="bold">${receiptData.totalAmount.toFixed(2)}</Text>
                                </Box>

                                {receiptData.shop && (
                                    <Box>
                                        <Text fontWeight="bold">Shop</Text>
                                        <Text>{receiptData.shop.name}</Text>
                                        {receiptData.shop.address && <Text fontSize="sm">{receiptData.shop.address}</Text>}
                                    </Box>
                                )}
                            </VStack>
                        </Box>

                        <Box maxW="200px">
                            <VStack>
                                <Image
                                    src={receiptData.imageUrl}
                                    alt="Receipt"
                                    borderRadius="md"
                                    maxH="200px"
                                    fallbackSrc="https://via.placeholder.com/200x300?text=Receipt+Image"
                                />
                                <Button
                                    as="a"
                                    href={receiptData.rawImagePath}
                                    target="_blank"
                                    size="sm"
                                    rightIcon={<ExternalLinkIcon />}
                                    variant="outline"
                                >
                                    View Original
                                </Button>
                            </VStack>
                        </Box>
                    </HStack>
                </CardBody>
            </Card>

            <Card>
                <CardBody>
                    <Heading size="md" mb={4}>Items ({receiptData.items.length})</Heading>
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Item</Th>
                                <Th>Category</Th>
                                <Th isNumeric>Quantity</Th>
                                <Th isNumeric>Price</Th>
                                <Th isNumeric>Total</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {receiptData.items.map((item) => (
                                <Tr key={item.id}>
                                    <Td>{item.name}</Td>
                                    <Td>
                                        <Badge colorScheme="blue">{item.category.name}</Badge>
                                    </Td>
                                    <Td isNumeric>{item.quantity}</Td>
                                    <Td isNumeric>${item.price.toFixed(2)}</Td>
                                    <Td isNumeric>${(item.price * item.quantity).toFixed(2)}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </CardBody>
            </Card>
        </VStack>
    );
};

export default ReceiptDetail; 