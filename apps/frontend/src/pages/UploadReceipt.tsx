import { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Heading,
    Text,
    VStack,
    useToast,
    Progress,
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const UploadReceipt = () => {
    const [isUploading, setIsUploading] = useState(false);
    const toast = useToast();

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
            });
            setIsUploading(false);
        },
        onError: (error) => {
            toast({
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'Please try again',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            setIsUploading(false);
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
                uploadMutation.mutate(acceptedFiles[0]);
            }
        },
    });

    return (
        <Container maxW="container.md" py={8}>
            <VStack spacing={8}>
                <Heading>Upload Receipt</Heading>

                <Box
                    {...getRootProps()}
                    w="100%"
                    h="300px"
                    border="2px"
                    borderStyle="dashed"
                    borderColor={isDragActive ? 'blue.400' : 'gray.200'}
                    borderRadius="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg={isDragActive ? 'blue.50' : 'gray.50'}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                        borderColor: 'blue.400',
                        bg: 'blue.50',
                    }}
                >
                    <input {...getInputProps()} />
                    <VStack spacing={2}>
                        <Text fontSize="lg" color="gray.600">
                            {isDragActive
                                ? 'Drop the receipt here'
                                : 'Drag and drop a receipt, or click to select'}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                            Supports JPG, JPEG, PNG
                        </Text>
                    </VStack>
                </Box>

                {isUploading && (
                    <Box w="100%">
                        <Text mb={2}>Processing receipt...</Text>
                        <Progress size="sm" isIndeterminate />
                    </Box>
                )}

                <Button
                    colorScheme="blue"
                    size="lg"
                    w="100%"
                    isLoading={isUploading}
                    loadingText="Uploading..."
                    {...getRootProps()}
                >
                    Select Receipt
                </Button>
            </VStack>
        </Container>
    );
};

export default UploadReceipt; 