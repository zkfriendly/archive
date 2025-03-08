import { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Heading,
    Input,
    VStack,
    useToast,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
    HStack,
    Text,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface Category {
    id: string;
    name: string;
    _count?: {
        items: number;
    };
}

const Categories = () => {
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editName, setEditName] = useState('');
    const toast = useToast();
    const queryClient = useQueryClient();

    const { data: categories, isLoading } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await axios.get('/api/categories');
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await axios.post('/api/categories', { name });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setNewCategory('');
            toast({
                title: 'Category created',
                status: 'success',
                duration: 2000,
            });
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

    const updateMutation = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const response = await axios.put(`/api/categories/${id}`, { name });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setEditingCategory(null);
            toast({
                title: 'Category updated',
                status: 'success',
                duration: 2000,
            });
        },
        onError: (error) => {
            toast({
                title: 'Failed to update category',
                description: error instanceof Error ? error.message : 'Please try again',
                status: 'error',
                duration: 3000,
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({
                title: 'Category deleted',
                status: 'success',
                duration: 2000,
            });
        },
        onError: (error) => {
            toast({
                title: 'Failed to delete category',
                description: error instanceof Error ? error.message : 'Please try again',
                status: 'error',
                duration: 3000,
            });
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        createMutation.mutate(newCategory.trim());
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setEditName(category.name);
    };

    const handleUpdate = () => {
        if (!editingCategory || !editName.trim()) return;
        updateMutation.mutate({ id: editingCategory.id, name: editName.trim() });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <Container maxW="container.md">
            <VStack spacing={8} align="stretch">
                <Heading>Categories</Heading>

                <Box as="form" onSubmit={handleCreate}>
                    <HStack>
                        <Input
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="New category name..."
                        />
                        <Button
                            type="submit"
                            colorScheme="blue"
                            isLoading={createMutation.isPending}
                        >
                            Add
                        </Button>
                    </HStack>
                </Box>

                {isLoading ? (
                    <Text>Loading...</Text>
                ) : (
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Name</Th>
                                <Th isNumeric>Items</Th>
                                <Th width="100px">Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {categories?.map((category) => (
                                <Tr key={category.id}>
                                    <Td>
                                        {editingCategory?.id === category.id ? (
                                            <HStack>
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    size="sm"
                                                />
                                                <IconButton
                                                    aria-label="Save"
                                                    icon={<FiCheck />}
                                                    size="sm"
                                                    colorScheme="green"
                                                    onClick={handleUpdate}
                                                />
                                                <IconButton
                                                    aria-label="Cancel"
                                                    icon={<FiX />}
                                                    size="sm"
                                                    onClick={() => setEditingCategory(null)}
                                                />
                                            </HStack>
                                        ) : (
                                            category.name
                                        )}
                                    </Td>
                                    <Td isNumeric>{category._count?.items || 0}</Td>
                                    <Td>
                                        <HStack spacing={2} justify="flex-end">
                                            <IconButton
                                                aria-label="Edit category"
                                                icon={<FiEdit2 />}
                                                size="sm"
                                                onClick={() => handleEdit(category)}
                                            />
                                            <IconButton
                                                aria-label="Delete category"
                                                icon={<FiTrash2 />}
                                                size="sm"
                                                colorScheme="red"
                                                onClick={() => handleDelete(category.id)}
                                            />
                                        </HStack>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </VStack>
        </Container>
    );
};

export default Categories; 