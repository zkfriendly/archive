import { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Heading,
    Input,
    Text,
    VStack,
    Card,
    CardBody,
    useToast,
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const Insights = () => {
    const [query, setQuery] = useState('');
    const [answer, setAnswer] = useState('');
    const toast = useToast();

    const queryMutation = useMutation({
        mutationFn: async (query: string) => {
            const response = await axios.post('/api/queries', { query });
            return response.data;
        },
        onSuccess: (data) => {
            setAnswer(data.answer);
        },
        onError: (error) => {
            toast({
                title: 'Query failed',
                description: error instanceof Error ? error.message : 'Please try again',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        queryMutation.mutate(query);
    };

    const exampleQueries = [
        'What are my total expenses this month?',
        'Which category do I spend the most on?',
        'Show me my spending trends over time',
        'What was my largest purchase last week?',
    ];

    return (
        <Container maxW="container.md">
            <VStack spacing={8} align="stretch">
                <Heading>Insights</Heading>

                <Box as="form" onSubmit={handleSubmit}>
                    <VStack spacing={4}>
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask anything about your expenses..."
                            size="lg"
                        />
                        <Button
                            type="submit"
                            colorScheme="blue"
                            isLoading={queryMutation.isPending}
                            w="100%"
                        >
                            Ask
                        </Button>
                    </VStack>
                </Box>

                {answer && (
                    <Card>
                        <CardBody>
                            <Text whiteSpace="pre-wrap">{answer}</Text>
                        </CardBody>
                    </Card>
                )}

                <Box>
                    <Text fontWeight="bold" mb={2}>
                        Example queries:
                    </Text>
                    <VStack align="stretch" spacing={2}>
                        {exampleQueries.map((example, index) => (
                            <Button
                                key={index}
                                variant="ghost"
                                justifyContent="flex-start"
                                onClick={() => setQuery(example)}
                            >
                                {example}
                            </Button>
                        ))}
                    </VStack>
                </Box>
            </VStack>
        </Container>
    );
};

export default Insights; 