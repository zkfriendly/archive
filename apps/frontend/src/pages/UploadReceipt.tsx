import React, { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Heading,
    Text,
    VStack,
    useToast,
    Progress,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    FormControl,
    FormLabel,
    Input,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Grid,
    GridItem,
    FormErrorMessage,
    Flex,
    Card,
    CardBody,
    useColorModeValue,
    Icon,
    Divider,
    HStack,
    Select,
    IconButton,
    Tooltip,
    Badge,
    SimpleGrid,
    InputGroup,
    InputLeftElement,
    InputRightElement,
    Collapse,
    useDisclosure,
    Stack,
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    FiUpload,
    FiEdit,
    FiPlus,
    FiTrash2,
    FiDollarSign,
    FiShoppingBag,
    FiCalendar,
    FiCheck,
    FiX,
    FiChevronRight,
    FiHome,
    FiInfo,
    FiCamera,
    FiCreditCard,
    FiTag,
    FiShoppingCart,
    FiSearch,
    FiChevronDown,
    FiChevronUp
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

interface ReceiptItem {
    name: string;
    price: number;
    categoryId?: string;
}

interface ManualReceipt {
    date: string;
    shopName: string;
    items: ReceiptItem[];
    totalAmount: number;
}

interface Category {
    id: string;
    name: string;
}

const UploadReceipt = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const toast = useToast();
    const queryClient = useQueryClient();
    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.100', 'gray.600');
    const textColor = useColorModeValue('gray.600', 'gray.300');
    const headingColor = useColorModeValue('gray.800', 'white');
    const subheadingColor = useColorModeValue('gray.700', 'gray.100');
    const mutedColor = useColorModeValue('gray.500', 'gray.400');
    const { isOpen: isHelpOpen, onToggle: onHelpToggle } = useDisclosure();

    // For new category creation
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategoryForItemIndex, setCreatingCategoryForItemIndex] = useState<number | null>(null);
    const { isOpen: isNewCategoryModalOpen, onOpen: openNewCategoryModal, onClose: closeNewCategoryModal } = useDisclosure();

    // For manual entry
    const [manualReceipt, setManualReceipt] = useState<ManualReceipt>({
        date: new Date().toISOString().split('T')[0],
        shopName: '',
        items: [{ name: '', price: 0 }],
        totalAmount: 0,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch categories for dropdown
    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await axios.get('/api/categories');
            return response.data;
        },
    });

    // Create category mutation
    const createCategoryMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await axios.post('/api/categories', { name });
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate categories query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['categories'] });

            toast({
                title: 'Category created',
                status: 'success',
                duration: 2000,
            });

            // If we have an item index, update that item with the new category
            if (creatingCategoryForItemIndex !== null && manualReceipt.items[creatingCategoryForItemIndex]) {
                handleItemChange(creatingCategoryForItemIndex, 'categoryId', data.id);
            }

            // Reset state
            setNewCategoryName('');
            setCreatingCategoryForItemIndex(null);
            closeNewCategoryModal();
        },
        onError: (error) => {
            toast({
                title: 'Failed to create category',
                description: error instanceof Error ? error.message : 'Please try again',
                status: 'error',
                duration: 3000,
            });
        },
    });

    // Function to handle opening the new category modal
    const handleOpenNewCategoryModal = (itemIndex: number) => {
        setCreatingCategoryForItemIndex(itemIndex);
        setNewCategoryName('');
        openNewCategoryModal();
    };

    // Function to handle creating a new category
    const handleCreateCategory = () => {
        if (newCategoryName.trim()) {
            createCategoryMutation.mutate(newCategoryName.trim());
        }
    };

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('receipt', file);
            const response = await axios.post('/api/receipts', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: () => {
            toast({
                title: 'Receipt uploaded successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
                position: 'top-right',
            });
            setIsUploading(false);
            setSuccessMessage('Your receipt has been processed successfully!');
        },
        onError: (error) => {
            toast({
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'Please try again',
                status: 'error',
                duration: 3000,
                isClosable: true,
                position: 'top-right',
            });
            setIsUploading(false);
        },
    });

    const manualEntryMutation = useMutation({
        mutationFn: async (data: ManualReceipt) => {
            const response = await axios.post('/api/receipts/manual', data);
            return response.data;
        },
        onSuccess: () => {
            toast({
                title: 'Receipt saved successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
                position: 'top-right',
            });
            // Reset form
            setManualReceipt({
                date: new Date().toISOString().split('T')[0],
                shopName: '',
                items: [{ name: '', price: 0 }],
                totalAmount: 0,
            });
            setSuccessMessage('Your receipt has been saved successfully!');
        },
        onError: (error) => {
            toast({
                title: 'Failed to save receipt',
                description: error instanceof Error ? error.message : 'Please try again',
                status: 'error',
                duration: 3000,
                isClosable: true,
                position: 'top-right',
            });
        },
    });

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png'],
        },
        maxFiles: 1,
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                setIsUploading(true);
                setSuccessMessage(null);
                uploadMutation.mutate(acceptedFiles[0]);
            }
        },
    });

    const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
        const updatedItems = [...manualReceipt.items];

        // If selecting "create-new" category, open the modal
        if (field === 'categoryId' && value === 'create-new') {
            handleOpenNewCategoryModal(index);
            return;
        }

        updatedItems[index] = { ...updatedItems[index], [field]: value };

        // Recalculate total
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price || 0), 0);

        setManualReceipt({
            ...manualReceipt,
            items: updatedItems,
            totalAmount: newTotal,
        });
    };

    const addItem = () => {
        setManualReceipt({
            ...manualReceipt,
            items: [...manualReceipt.items, { name: '', price: 0 }],
        });
    };

    const removeItem = (index: number) => {
        if (manualReceipt.items.length <= 1) return;

        const updatedItems = manualReceipt.items.filter((_, i) => i !== index);
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price || 0), 0);

        setManualReceipt({
            ...manualReceipt,
            items: updatedItems,
            totalAmount: newTotal,
        });
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!manualReceipt.date) newErrors.date = 'Date is required';
        if (!manualReceipt.shopName) newErrors.shopName = 'Shop name is required';

        let hasItemErrors = false;
        manualReceipt.items.forEach((item, index) => {
            if (!item.name) {
                newErrors[`item-${index}-name`] = 'Item name is required';
                hasItemErrors = true;
            }
            if (item.price <= 0) {
                newErrors[`item-${index}-price`] = 'Price must be greater than 0';
                hasItemErrors = true;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        setSuccessMessage(null);
        if (validateForm()) {
            manualEntryMutation.mutate(manualReceipt);
        }
    };

    const handleTabChange = (index: number) => {
        setActiveTab(index);
        setSuccessMessage(null);
    };

    return (
        <Box>
            <Box mb={8}>
                <Breadcrumb separator={<Icon as={FiChevronRight} color={mutedColor} />}>
                    <BreadcrumbItem>
                        <BreadcrumbLink as={Link} to="/" color={mutedColor}>
                            <HStack spacing={1}>
                                <Icon as={FiHome} />
                                <Text>Home</Text>
                            </HStack>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem isCurrentPage>
                        <BreadcrumbLink color={headingColor} fontWeight="medium">Add Receipt</BreadcrumbLink>
                    </BreadcrumbItem>
                </Breadcrumb>

                <Flex
                    justify="space-between"
                    align={{ base: "start", md: "center" }}
                    direction={{ base: "column", md: "row" }}
                    mt={4}
                    gap={{ base: 2, md: 0 }}
                >
                    <Box>
                        <Heading size="lg" color={headingColor} mb={1}>
                            Add Receipt
                        </Heading>
                        <Text color={mutedColor}>
                            Upload a receipt image or enter details manually
                        </Text>
                    </Box>

                    <Button
                        leftIcon={<FiInfo />}
                        variant="ghost"
                        size="sm"
                        onClick={onHelpToggle}
                    >
                        {isHelpOpen ? 'Hide Tips' : 'Show Tips'}
                    </Button>
                </Flex>

                <Collapse in={isHelpOpen} animateOpacity>
                    <Alert
                        status="info"
                        variant="subtle"
                        flexDirection="column"
                        alignItems="flex-start"
                        mt={4}
                        p={4}
                        borderRadius="xl"
                        bg="blue.50"
                        borderWidth="1px"
                        borderColor="blue.100"
                    >
                        <Flex>
                            <AlertIcon color="blue.500" />
                            <AlertTitle color="blue.700" fontWeight="bold" mb={1}>Tips for adding receipts</AlertTitle>
                        </Flex>
                        <AlertDescription color="blue.700">
                            <VStack align="start" spacing={2} mt={2}>
                                <Text>• For image uploads, ensure the receipt is well-lit and all text is visible</Text>
                                <Text>• Manual entry is useful for digital receipts or when images aren't available</Text>
                                <Text>• Categorizing items helps with better expense tracking and insights</Text>
                            </VStack>
                        </AlertDescription>
                    </Alert>
                </Collapse>
            </Box>

            {successMessage && (
                <Alert
                    status="success"
                    variant="subtle"
                    borderRadius="xl"
                    mb={6}
                    bg="green.50"
                    borderWidth="1px"
                    borderColor="green.100"
                >
                    <AlertIcon color="green.500" />
                    <AlertDescription color="green.700">{successMessage}</AlertDescription>
                    <Button
                        ml="auto"
                        size="sm"
                        colorScheme="green"
                        variant="ghost"
                        as={Link}
                        to="/"
                    >
                        Go to Dashboard
                    </Button>
                </Alert>
            )}

            <Card
                bg={bgColor}
                shadow="sm"
                borderRadius="xl"
                overflow="hidden"
                mb={8}
                borderWidth="1px"
                borderColor={borderColor}
            >
                <CardBody p={0}>
                    <Tabs
                        isFitted
                        variant="enclosed"
                        index={activeTab}
                        onChange={handleTabChange}
                        colorScheme="blue"
                    >
                        <TabList borderBottomWidth="1px" borderBottomColor={borderColor}>
                            <Tab
                                py={4}
                                fontWeight="semibold"
                                _selected={{
                                    color: 'blue.500',
                                    borderColor: borderColor,
                                    borderBottomColor: 'transparent',
                                    bg: bgColor
                                }}
                            >
                                <HStack>
                                    <Icon as={FiCamera} />
                                    <Text>Upload Receipt</Text>
                                </HStack>
                            </Tab>
                            <Tab
                                py={4}
                                fontWeight="semibold"
                                _selected={{
                                    color: 'blue.500',
                                    borderColor: borderColor,
                                    borderBottomColor: 'transparent',
                                    bg: bgColor
                                }}
                            >
                                <HStack>
                                    <Icon as={FiEdit} />
                                    <Text>Manual Entry</Text>
                                </HStack>
                            </Tab>
                        </TabList>

                        <TabPanels>
                            {/* Upload Receipt Tab */}
                            <TabPanel p={{ base: 4, md: 8 }}>
                                <VStack spacing={6}>
                                    <Box
                                        {...getRootProps()}
                                        w="100%"
                                        h={{ base: "200px", md: "300px" }}
                                        border="2px"
                                        borderStyle="dashed"
                                        borderColor={isDragActive ? 'blue.400' : borderColor}
                                        borderRadius="xl"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        bg={isDragActive ? 'blue.50' : useColorModeValue('gray.50', 'gray.800')}
                                        cursor="pointer"
                                        transition="all 0.2s"
                                        _hover={{
                                            borderColor: 'blue.400',
                                            bg: useColorModeValue('blue.50', 'blue.900'),
                                        }}
                                    >
                                        <input {...getInputProps()} />
                                        <VStack spacing={3}>
                                            <Icon
                                                as={FiUpload}
                                                boxSize={{ base: 8, md: 12 }}
                                                color="blue.500"
                                            />
                                            <VStack spacing={1}>
                                                <Text
                                                    fontSize={{ base: "md", md: "lg" }}
                                                    fontWeight="medium"
                                                    color={headingColor}
                                                >
                                                    {isDragActive
                                                        ? 'Drop the receipt here'
                                                        : 'Drag and drop a receipt, or click to select'}
                                                </Text>
                                                <Text fontSize="sm" color={mutedColor}>
                                                    Supports JPG, JPEG, PNG
                                                </Text>
                                            </VStack>
                                        </VStack>
                                    </Box>

                                    {isUploading && (
                                        <Box w="100%" mt={4}>
                                            <Flex justify="space-between" mb={2}>
                                                <Text color={textColor}>Processing receipt...</Text>
                                                <Text color={textColor} fontWeight="medium">
                                                    Please wait
                                                </Text>
                                            </Flex>
                                            <Progress
                                                size="sm"
                                                isIndeterminate
                                                colorScheme="blue"
                                                borderRadius="full"
                                            />
                                        </Box>
                                    )}

                                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                                        <Button
                                            colorScheme="blue"
                                            size="lg"
                                            h="56px"
                                            isLoading={isUploading}
                                            loadingText="Uploading..."
                                            leftIcon={<FiCamera />}
                                            borderRadius="xl"
                                            {...getRootProps()}
                                        >
                                            Take Photo or Select File
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="lg"
                                            h="56px"
                                            leftIcon={<FiEdit />}
                                            borderRadius="xl"
                                            onClick={() => setActiveTab(1)}
                                            borderColor={borderColor}
                                        >
                                            Switch to Manual Entry
                                        </Button>
                                    </SimpleGrid>
                                </VStack>
                            </TabPanel>

                            {/* Manual Entry Tab */}
                            <TabPanel p={{ base: 4, md: 8 }}>
                                <VStack spacing={8} align="stretch">
                                    <Box>
                                        <Heading size="md" mb={4} color={headingColor}>
                                            Receipt Details
                                        </Heading>

                                        <Grid
                                            templateColumns="repeat(12, 1fr)"
                                            gap={6}
                                            p={6}
                                            bg={useColorModeValue('gray.50', 'gray.800')}
                                            borderRadius="xl"
                                        >
                                            <GridItem colSpan={{ base: 12, md: 6 }}>
                                                <FormControl isInvalid={!!errors.date}>
                                                    <FormLabel color={subheadingColor}>Date</FormLabel>
                                                    <InputGroup>
                                                        <InputLeftElement pointerEvents="none">
                                                            <Icon as={FiCalendar} color={mutedColor} />
                                                        </InputLeftElement>
                                                        <Input
                                                            type="date"
                                                            value={manualReceipt.date}
                                                            onChange={(e) => setManualReceipt({
                                                                ...manualReceipt,
                                                                date: e.target.value
                                                            })}
                                                            bg={bgColor}
                                                            borderRadius="lg"
                                                        />
                                                    </InputGroup>
                                                    {errors.date && <FormErrorMessage>{errors.date}</FormErrorMessage>}
                                                </FormControl>
                                            </GridItem>
                                            <GridItem colSpan={{ base: 12, md: 6 }}>
                                                <FormControl isInvalid={!!errors.shopName}>
                                                    <FormLabel color={subheadingColor}>Shop Name</FormLabel>
                                                    <InputGroup>
                                                        <InputLeftElement pointerEvents="none">
                                                            <Icon as={FiShoppingBag} color={mutedColor} />
                                                        </InputLeftElement>
                                                        <Input
                                                            placeholder="Enter shop name"
                                                            value={manualReceipt.shopName}
                                                            onChange={(e) => setManualReceipt({
                                                                ...manualReceipt,
                                                                shopName: e.target.value
                                                            })}
                                                            bg={bgColor}
                                                            borderRadius="lg"
                                                        />
                                                    </InputGroup>
                                                    {errors.shopName && <FormErrorMessage>{errors.shopName}</FormErrorMessage>}
                                                </FormControl>
                                            </GridItem>
                                        </Grid>
                                    </Box>

                                    <Box>
                                        <Flex justify="space-between" align="center" mb={4}>
                                            <Heading size="md" color={headingColor}>
                                                Items
                                            </Heading>
                                            <Button
                                                leftIcon={<FiPlus />}
                                                colorScheme="blue"
                                                size="sm"
                                                onClick={addItem}
                                                borderRadius="lg"
                                            >
                                                Add Item
                                            </Button>
                                        </Flex>

                                        <Card
                                            borderRadius="xl"
                                            borderWidth="1px"
                                            borderColor={borderColor}
                                            bg={useColorModeValue('gray.50', 'gray.800')}
                                            shadow="none"
                                        >
                                            <CardBody>
                                                <VStack spacing={6} align="stretch">
                                                    {manualReceipt.items.map((item, index) => (
                                                        <Box
                                                            key={index}
                                                            p={4}
                                                            borderRadius="xl"
                                                            bg={bgColor}
                                                            borderWidth="1px"
                                                            borderColor={borderColor}
                                                        >
                                                            <Flex justify="space-between" mb={4}>
                                                                <HStack>
                                                                    <Badge
                                                                        colorScheme="blue"
                                                                        borderRadius="full"
                                                                        px={2}
                                                                    >
                                                                        Item {index + 1}
                                                                    </Badge>
                                                                </HStack>
                                                                <IconButton
                                                                    aria-label="Remove item"
                                                                    icon={<FiTrash2 />}
                                                                    variant="ghost"
                                                                    colorScheme="red"
                                                                    size="sm"
                                                                    isDisabled={manualReceipt.items.length <= 1}
                                                                    onClick={() => removeItem(index)}
                                                                />
                                                            </Flex>

                                                            <Grid templateColumns="repeat(12, 1fr)" gap={4}>
                                                                <GridItem colSpan={{ base: 12, md: 5 }}>
                                                                    <FormControl isInvalid={!!errors[`item-${index}-name`]}>
                                                                        <FormLabel color={subheadingColor}>Item Name</FormLabel>
                                                                        <InputGroup>
                                                                            <InputLeftElement pointerEvents="none">
                                                                                <Icon as={FiShoppingCart} color={mutedColor} />
                                                                            </InputLeftElement>
                                                                            <Input
                                                                                placeholder="Item name"
                                                                                value={item.name}
                                                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                                                borderRadius="lg"
                                                                            />
                                                                        </InputGroup>
                                                                        {errors[`item-${index}-name`] && (
                                                                            <FormErrorMessage>{errors[`item-${index}-name`]}</FormErrorMessage>
                                                                        )}
                                                                    </FormControl>
                                                                </GridItem>
                                                                <GridItem colSpan={{ base: 6, md: 3 }}>
                                                                    <FormControl isInvalid={!!errors[`item-${index}-price`]}>
                                                                        <FormLabel color={subheadingColor}>Price</FormLabel>
                                                                        <InputGroup>
                                                                            <InputLeftElement pointerEvents="none">
                                                                                <Icon as={FiDollarSign} color={mutedColor} />
                                                                            </InputLeftElement>
                                                                            <NumberInput
                                                                                min={0}
                                                                                precision={2}
                                                                                value={item.price}
                                                                                onChange={(_, value) => handleItemChange(index, 'price', value)}
                                                                                w="full"
                                                                            >
                                                                                <NumberInputField borderRadius="lg" pl="2.5rem" />
                                                                                <NumberInputStepper>
                                                                                    <NumberIncrementStepper />
                                                                                    <NumberDecrementStepper />
                                                                                </NumberInputStepper>
                                                                            </NumberInput>
                                                                        </InputGroup>
                                                                        {errors[`item-${index}-price`] && (
                                                                            <FormErrorMessage>{errors[`item-${index}-price`]}</FormErrorMessage>
                                                                        )}
                                                                    </FormControl>
                                                                </GridItem>
                                                                <GridItem colSpan={{ base: 6, md: 4 }}>
                                                                    <FormControl>
                                                                        <FormLabel color={subheadingColor}>Category</FormLabel>
                                                                        <InputGroup>
                                                                            <InputLeftElement pointerEvents="none">
                                                                                <Icon as={FiTag} color={mutedColor} />
                                                                            </InputLeftElement>
                                                                            <Select
                                                                                placeholder="Select category"
                                                                                value={item.categoryId || ''}
                                                                                onChange={(e) => handleItemChange(index, 'categoryId', e.target.value)}
                                                                                borderRadius="lg"
                                                                                pl="2.5rem"
                                                                                bg={bgColor}
                                                                            >
                                                                                {categories?.map((category) => (
                                                                                    <option key={category.id} value={category.id}>
                                                                                        {category.name}
                                                                                    </option>
                                                                                ))}
                                                                                <option value="create-new" style={{ color: 'blue', fontWeight: 'bold' }}>+ Create new category</option>
                                                                            </Select>
                                                                            <Tooltip label="Create new category" placement="top">
                                                                                <InputRightElement width="4.5rem">
                                                                                    <Button
                                                                                        h="1.75rem"
                                                                                        size="sm"
                                                                                        onClick={() => handleOpenNewCategoryModal(index)}
                                                                                        variant="ghost"
                                                                                        colorScheme="blue"
                                                                                    >
                                                                                        <Icon as={FiPlus} />
                                                                                    </Button>
                                                                                </InputRightElement>
                                                                            </Tooltip>
                                                                        </InputGroup>
                                                                    </FormControl>
                                                                </GridItem>
                                                            </Grid>
                                                        </Box>
                                                    ))}
                                                </VStack>
                                            </CardBody>
                                        </Card>
                                    </Box>

                                    <Card
                                        borderRadius="xl"
                                        borderWidth="1px"
                                        borderColor={borderColor}
                                        bg={useColorModeValue('gray.50', 'gray.800')}
                                        shadow="none"
                                    >
                                        <CardBody>
                                            <Flex
                                                justify="space-between"
                                                align="center"
                                                p={4}
                                                bg={bgColor}
                                                borderRadius="xl"
                                                borderWidth="1px"
                                                borderColor={borderColor}
                                            >
                                                <HStack>
                                                    <Icon as={FiCreditCard} color="blue.500" boxSize={5} />
                                                    <Text fontWeight="semibold" fontSize="lg" color={headingColor}>
                                                        Total Amount
                                                    </Text>
                                                </HStack>
                                                <Text fontWeight="bold" fontSize="xl" color="blue.500">
                                                    ${manualReceipt.totalAmount.toFixed(2)}
                                                </Text>
                                            </Flex>
                                        </CardBody>
                                    </Card>

                                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                        <Button
                                            colorScheme="blue"
                                            size="lg"
                                            h="56px"
                                            onClick={handleSubmit}
                                            isLoading={manualEntryMutation.isPending}
                                            loadingText="Saving..."
                                            leftIcon={<FiCheck />}
                                            borderRadius="xl"
                                        >
                                            Save Receipt
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="lg"
                                            h="56px"
                                            leftIcon={<FiCamera />}
                                            borderRadius="xl"
                                            onClick={() => setActiveTab(0)}
                                            borderColor={borderColor}
                                        >
                                            Switch to Upload
                                        </Button>
                                    </SimpleGrid>
                                </VStack>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </CardBody>
            </Card>

            {/* New Category Modal */}
            <Modal isOpen={isNewCategoryModalOpen} onClose={closeNewCategoryModal} initialFocusRef={{ current: null }}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Create New Category</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <Text mb={4} color={mutedColor}>
                            Create a new category that will be available for all your expenses.
                        </Text>
                        <FormControl>
                            <FormLabel color={subheadingColor}>Category Name</FormLabel>
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Enter category name"
                                autoFocus
                                bg={bgColor}
                                borderRadius="lg"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newCategoryName.trim()) {
                                        handleCreateCategory();
                                    }
                                }}
                            />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            colorScheme="blue"
                            mr={3}
                            onClick={handleCreateCategory}
                            isLoading={createCategoryMutation.isPending}
                            isDisabled={!newCategoryName.trim()}
                            leftIcon={<FiPlus />}
                            borderRadius="lg"
                        >
                            Create Category
                        </Button>
                        <Button variant="ghost" onClick={closeNewCategoryModal} borderRadius="lg">Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
};

export default UploadReceipt; 