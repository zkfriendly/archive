import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    IconButton,
    Input,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Select,
    Tooltip,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    FormControl,
    FormLabel,
    Editable,
    EditableInput,
    EditablePreview,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
} from '@chakra-ui/react';
import {
    ExternalLinkIcon,
    EditIcon,
    DeleteIcon,
    AddIcon,
    CheckIcon,
    CloseIcon,
    RepeatIcon,
    ChevronDownIcon
} from '@chakra-ui/icons';

interface Item {
    id: string;
    name: string;
    price: number;
    quantity: number;
    categoryId: string;
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
    shopId?: string;
}

interface Category {
    id: string;
    name: string;
}

const ReceiptDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const toast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editedReceipt, setEditedReceipt] = useState<Receipt | null>(null);
    const [newItem, setNewItem] = useState<Partial<Item> | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    const deleteAlertDisclosure = useDisclosure();
    const recalculateDisclosure = useDisclosure();
    const deleteReceiptDisclosure = useDisclosure();
    const cancelRef = React.useRef<HTMLButtonElement>(null);

    // Fetch receipt data
    const { data: receipt, isLoading, error } = useQuery<Receipt>({
        queryKey: ['receipt', id],
        queryFn: async () => {
            const response = await axios.get(`/api/receipts/${id}`);
            return response.data;
        },
    });

    // Fetch categories for dropdown
    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await axios.get('/api/categories');
            return response.data;
        },
    });

    // Update receipt mutation
    const updateReceiptMutation = useMutation({
        mutationFn: async (updatedReceipt: Receipt) => {
            const response = await axios.put(`/api/receipts/${id}`, updatedReceipt);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipt', id] });
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            setIsSaving(false);
            toast({
                title: 'Receipt updated',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        },
        onError: () => {
            setIsSaving(false);
            toast({
                title: 'Error',
                description: 'Failed to update receipt',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        },
    });

    // Delete receipt mutation
    const deleteReceiptMutation = useMutation({
        mutationFn: async () => {
            await axios.delete(`/api/receipts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            toast({
                title: 'Receipt deleted',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            navigate('/dashboard');
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to delete receipt',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        },
    });

    // Recalculate receipt from image mutation
    const recalculateReceiptMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post(`/api/receipts/${id}/recalculate`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipt', id] });
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            toast({
                title: 'Receipt recalculated',
                description: 'Receipt data has been updated based on the original image',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to recalculate receipt',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        },
    });

    // Initialize editing state when receipt data is loaded
    React.useEffect(() => {
        if (receipt && !editedReceipt) {
            setEditedReceipt({
                ...receipt,
                items: receipt.items.map(item => ({ ...item }))
            });
        }
    }, [receipt, editedReceipt]);

    if (isLoading) {
        return (
            <Flex justify="center" align="center" h="300px">
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (error || !receipt || !editedReceipt) {
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

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel editing
            setEditedReceipt({
                ...receipt,
                items: receipt.items.map(item => ({ ...item }))
            });
            setIsEditing(false);
            setNewItem(null);

            // Clear any pending save
            if (saveTimeout) {
                clearTimeout(saveTimeout);
                setSaveTimeout(null);
            }
        } else {
            // Start editing
            setIsEditing(true);
        }
    };

    const handleSaveReceipt = () => {
        if (editedReceipt) {
            setIsSaving(true);

            // Calculate total amount from items
            const totalAmount = editedReceipt.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

            updateReceiptMutation.mutate({
                ...editedReceipt,
                totalAmount
            });
        }
    };

    // Auto-save changes after a delay
    const debouncedSave = (updatedReceipt: Receipt) => {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        setIsSaving(true);
        const timeout = setTimeout(() => {
            const totalAmount = updatedReceipt.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

            updateReceiptMutation.mutate({
                ...updatedReceipt,
                totalAmount
            });
        }, 1500); // 1.5 second delay before saving

        setSaveTimeout(timeout);
    };

    const handleDeleteReceipt = () => {
        deleteReceiptMutation.mutate();
    };

    const handleRecalculateReceipt = () => {
        recalculateReceiptMutation.mutate();
        recalculateDisclosure.onClose();
    };

    const handleItemChange = (itemId: string, field: keyof Item, value: any) => {
        if (editedReceipt) {
            const updatedReceipt = {
                ...editedReceipt,
                items: editedReceipt.items.map(item =>
                    item.id === itemId
                        ? { ...item, [field]: value }
                        : item
                )
            };

            setEditedReceipt(updatedReceipt);
            debouncedSave(updatedReceipt);
        }
    };

    const handleDeleteItem = (itemId: string) => {
        if (editedReceipt) {
            const updatedReceipt = {
                ...editedReceipt,
                items: editedReceipt.items.filter(item => item.id !== itemId)
            };
            setEditedReceipt(updatedReceipt);
            debouncedSave(updatedReceipt);
        }
        setItemToDelete(null);
    };

    const handleAddItem = () => {
        if (newItem && editedReceipt && categories && categories.length > 0) {
            const tempId = `temp-${Date.now()}`;
            const newItemComplete: Item = {
                id: tempId,
                name: newItem.name || 'New Item',
                price: newItem.price || 0,
                quantity: newItem.quantity || 1,
                categoryId: newItem.categoryId || categories[0].id,
                category: {
                    id: newItem.categoryId || categories[0].id,
                    name: categories.find(c => c.id === newItem.categoryId)?.name || categories[0].name
                }
            };

            const updatedReceipt = {
                ...editedReceipt,
                items: [...editedReceipt.items, newItemComplete]
            };

            setEditedReceipt(updatedReceipt);
            debouncedSave(updatedReceipt);
            setNewItem(null);
        }
    };

    const startAddingItem = () => {
        if (categories && categories.length > 0) {
            setNewItem({
                name: '',
                price: 0,
                quantity: 1,
                categoryId: categories[0].id
            });
        }
    };

    const cancelAddItem = () => {
        setNewItem(null);
    };

    return (
        <VStack spacing={6} align="stretch">
            <Flex justify="space-between" align="center">
                <HStack>
                    <Heading size="lg">Receipt Details</Heading>
                    {isEditing && (
                        <Badge colorScheme="blue" fontSize="md" variant="solid" px={2} py={1}>
                            Editing Mode
                        </Badge>
                    )}
                </HStack>
                <HStack spacing={3}>
                    {isSaving && (
                        <HStack spacing={2}>
                            <Spinner size="sm" color="blue.500" />
                            <Text fontSize="sm" color="blue.500">Saving changes...</Text>
                        </HStack>
                    )}

                    <Tooltip label={isEditing ? "Done editing" : "Edit receipt"}>
                        <Button
                            leftIcon={isEditing ? <CheckIcon /> : <EditIcon />}
                            size="sm"
                            onClick={handleEditToggle}
                            colorScheme={isEditing ? "green" : "blue"}
                            isLoading={updateReceiptMutation.isPending}
                        >
                            {isEditing ? "Done" : "Edit"}
                        </Button>
                    </Tooltip>

                    <Menu>
                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="sm" variant="outline">
                            Actions
                        </MenuButton>
                        <MenuList>
                            <MenuItem
                                icon={<RepeatIcon />}
                                onClick={recalculateDisclosure.onOpen}
                            >
                                Recalculate from image
                            </MenuItem>
                            <MenuItem
                                icon={<DeleteIcon />}
                                onClick={deleteReceiptDisclosure.onOpen}
                                color="red.500"
                            >
                                Delete receipt
                            </MenuItem>
                        </MenuList>
                    </Menu>

                    <Button as={Link} to="/dashboard" size="sm" variant="outline">
                        Back
                    </Button>
                </HStack>
            </Flex>

            <Card borderWidth={isEditing ? "2px" : "1px"} borderColor={isEditing ? "blue.400" : "gray.200"}>
                <CardBody>
                    <HStack spacing={6} align="flex-start">
                        <Box flex="1">
                            <VStack align="stretch" spacing={4}>
                                <Box>
                                    <Text fontWeight="bold">Date</Text>
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={new Date(editedReceipt.date).toISOString().split('T')[0]}
                                            onChange={(e) => {
                                                const updatedReceipt = {
                                                    ...editedReceipt,
                                                    date: new Date(e.target.value).toISOString()
                                                };
                                                setEditedReceipt(updatedReceipt);
                                                debouncedSave(updatedReceipt);
                                            }}
                                            size="sm"
                                        />
                                    ) : (
                                        <Text>{new Date(receipt.date).toLocaleDateString()}</Text>
                                    )}
                                </Box>

                                <Box>
                                    <Text fontWeight="bold">Total Amount</Text>
                                    <Text fontSize="xl" fontWeight="bold">
                                        ${editedReceipt.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                                    </Text>
                                    <Text fontSize="xs" color="gray.500">
                                        (Calculated from items)
                                    </Text>
                                </Box>

                                {(receipt.shop || isEditing) && (
                                    <Box>
                                        <Text fontWeight="bold">Shop</Text>
                                        {isEditing ? (
                                            <Input
                                                value={editedReceipt.shop?.name || ''}
                                                onChange={(e) => {
                                                    const updatedReceipt = {
                                                        ...editedReceipt,
                                                        shop: {
                                                            ...(editedReceipt.shop || { id: '', name: '' }),
                                                            name: e.target.value
                                                        }
                                                    };
                                                    setEditedReceipt(updatedReceipt);
                                                    debouncedSave(updatedReceipt);
                                                }}
                                                placeholder="Shop name"
                                                size="sm"
                                                mb={2}
                                            />
                                        ) : (
                                            <Text>{receipt.shop?.name || 'Unknown Shop'}</Text>
                                        )}

                                        {isEditing ? (
                                            <Input
                                                value={editedReceipt.shop?.address || ''}
                                                onChange={(e) => {
                                                    const updatedReceipt = {
                                                        ...editedReceipt,
                                                        shop: {
                                                            ...(editedReceipt.shop || { id: '', name: '' }),
                                                            address: e.target.value
                                                        }
                                                    };
                                                    setEditedReceipt(updatedReceipt);
                                                    debouncedSave(updatedReceipt);
                                                }}
                                                placeholder="Shop address (optional)"
                                                size="sm"
                                            />
                                        ) : (
                                            receipt.shop?.address && <Text fontSize="sm">{receipt.shop.address}</Text>
                                        )}
                                    </Box>
                                )}
                            </VStack>
                        </Box>

                        <Box maxW="200px">
                            <VStack>
                                <Image
                                    src={receipt.imageUrl}
                                    alt="Receipt"
                                    borderRadius="md"
                                    maxH="200px"
                                    fallbackSrc="https://via.placeholder.com/200x300?text=Receipt+Image"
                                />
                                <HStack>
                                    <Button
                                        as="a"
                                        href={receipt.rawImagePath}
                                        target="_blank"
                                        size="sm"
                                        rightIcon={<ExternalLinkIcon />}
                                        variant="outline"
                                    >
                                        View Original
                                    </Button>
                                </HStack>
                            </VStack>
                        </Box>
                    </HStack>
                </CardBody>
            </Card>

            <Card borderWidth={isEditing ? "2px" : "1px"} borderColor={isEditing ? "blue.400" : "gray.200"}>
                <CardBody>
                    <Flex justify="space-between" align="center" mb={4}>
                        <Heading size="md">Items ({editedReceipt.items.length})</Heading>
                        {isEditing && !newItem && (
                            <Tooltip label="Add item">
                                <Button
                                    leftIcon={<AddIcon />}
                                    size="sm"
                                    onClick={startAddingItem}
                                    colorScheme="blue"
                                >
                                    Add Item
                                </Button>
                            </Tooltip>
                        )}
                    </Flex>

                    {newItem && (
                        <Box mb={4} p={3} borderWidth="1px" borderRadius="md" borderStyle="dashed">
                            <Flex justify="space-between" align="center" mb={2}>
                                <Text fontWeight="bold">New Item</Text>
                                <IconButton
                                    aria-label="Cancel"
                                    icon={<CloseIcon />}
                                    size="xs"
                                    onClick={cancelAddItem}
                                    variant="ghost"
                                />
                            </Flex>
                            <HStack spacing={3} mb={2}>
                                <FormControl>
                                    <FormLabel fontSize="xs">Name</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newItem.name || ''}
                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                        placeholder="Item name"
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="xs">Price</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newItem.price || 0}
                                        onChange={(_, value) => setNewItem({ ...newItem, price: value })}
                                        min={0}
                                        precision={2}
                                        step={0.01}
                                    >
                                        <NumberInputField />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>
                            </HStack>
                            <HStack spacing={3}>
                                <FormControl>
                                    <FormLabel fontSize="xs">Quantity</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newItem.quantity || 1}
                                        onChange={(_, value) => setNewItem({ ...newItem, quantity: value })}
                                        min={1}
                                        step={1}
                                    >
                                        <NumberInputField />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="xs">Category</FormLabel>
                                    <Select
                                        size="sm"
                                        value={newItem.categoryId || ''}
                                        onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                                    >
                                        {categories?.map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                            </HStack>
                            <Button
                                mt={3}
                                size="sm"
                                colorScheme="blue"
                                onClick={handleAddItem}
                                isDisabled={!newItem.name}
                                width="full"
                            >
                                Add Item
                            </Button>
                        </Box>
                    )}

                    <Table variant="simple" size="sm">
                        <Thead>
                            <Tr>
                                <Th>Item</Th>
                                <Th>Category</Th>
                                <Th isNumeric>Quantity</Th>
                                <Th isNumeric>Price</Th>
                                <Th isNumeric>Total</Th>
                                {isEditing && <Th width="80px">Actions</Th>}
                            </Tr>
                        </Thead>
                        <Tbody>
                            {editedReceipt.items.map((item) => (
                                <Tr key={item.id}>
                                    <Td>
                                        {isEditing ? (
                                            <Input
                                                size="sm"
                                                value={item.name}
                                                onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                            />
                                        ) : (
                                            <Text>{item.name}</Text>
                                        )}
                                    </Td>
                                    <Td>
                                        {isEditing ? (
                                            <Select
                                                size="sm"
                                                value={item.categoryId}
                                                onChange={(e) => {
                                                    const categoryId = e.target.value;
                                                    const category = categories?.find(c => c.id === categoryId);
                                                    handleItemChange(item.id, 'categoryId', categoryId);
                                                    handleItemChange(item.id, 'category', {
                                                        id: categoryId,
                                                        name: category?.name || ''
                                                    });
                                                }}
                                            >
                                                {categories?.map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </Select>
                                        ) : (
                                            <Badge colorScheme="blue">{item.category.name}</Badge>
                                        )}
                                    </Td>
                                    <Td isNumeric>
                                        {isEditing ? (
                                            <NumberInput
                                                size="sm"
                                                value={item.quantity}
                                                onChange={(_, value) => handleItemChange(item.id, 'quantity', value)}
                                                min={1}
                                                step={1}
                                                maxW="80px"
                                                ml="auto"
                                            >
                                                <NumberInputField />
                                                <NumberInputStepper>
                                                    <NumberIncrementStepper />
                                                    <NumberDecrementStepper />
                                                </NumberInputStepper>
                                            </NumberInput>
                                        ) : (
                                            item.quantity
                                        )}
                                    </Td>
                                    <Td isNumeric>
                                        {isEditing ? (
                                            <NumberInput
                                                size="sm"
                                                value={item.price}
                                                onChange={(_, value) => handleItemChange(item.id, 'price', value)}
                                                min={0}
                                                step={0.01}
                                                precision={2}
                                                maxW="100px"
                                                ml="auto"
                                            >
                                                <NumberInputField />
                                                <NumberInputStepper>
                                                    <NumberIncrementStepper />
                                                    <NumberDecrementStepper />
                                                </NumberInputStepper>
                                            </NumberInput>
                                        ) : (
                                            `$${item.price.toFixed(2)}`
                                        )}
                                    </Td>
                                    <Td isNumeric>${(item.price * item.quantity).toFixed(2)}</Td>
                                    {isEditing && (
                                        <Td>
                                            <Tooltip label="Delete item">
                                                <IconButton
                                                    aria-label="Delete item"
                                                    icon={<DeleteIcon />}
                                                    size="xs"
                                                    onClick={() => {
                                                        setItemToDelete(item.id);
                                                        deleteAlertDisclosure.onOpen();
                                                    }}
                                                    colorScheme="red"
                                                    variant="ghost"
                                                />
                                            </Tooltip>
                                        </Td>
                                    )}
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </CardBody>
            </Card>

            {/* Delete Item Confirmation */}
            <AlertDialog
                isOpen={deleteAlertDisclosure.isOpen}
                leastDestructiveRef={cancelRef}
                onClose={deleteAlertDisclosure.onClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Item
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to delete this item? This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={deleteAlertDisclosure.onClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={() => {
                                    if (itemToDelete) {
                                        handleDeleteItem(itemToDelete);
                                    }
                                    deleteAlertDisclosure.onClose();
                                }}
                                ml={3}
                            >
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>

            {/* Recalculate Receipt Confirmation */}
            <AlertDialog
                isOpen={recalculateDisclosure.isOpen}
                leastDestructiveRef={cancelRef}
                onClose={recalculateDisclosure.onClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Recalculate Receipt
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            This will recalculate all receipt data from the original image. Any manual edits will be lost. Are you sure you want to continue?
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={recalculateDisclosure.onClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="blue"
                                onClick={handleRecalculateReceipt}
                                ml={3}
                                isLoading={recalculateReceiptMutation.isPending}
                            >
                                Recalculate
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>

            {/* Delete Receipt Confirmation */}
            <AlertDialog
                isOpen={deleteReceiptDisclosure.isOpen}
                leastDestructiveRef={cancelRef}
                onClose={deleteReceiptDisclosure.onClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Receipt
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to delete this entire receipt? This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={deleteReceiptDisclosure.onClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={handleDeleteReceipt}
                                ml={3}
                                isLoading={deleteReceiptMutation.isPending}
                            >
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </VStack>
    );
};

export default ReceiptDetail; 