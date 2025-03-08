import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Anthropic } from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Schema for query request
const querySchema = z.object({
    query: z.string().min(1),
});

// Process natural language query
router.post('/', async (req, res) => {
    try {
        const { query } = querySchema.parse(req.body);

        // Get all data needed for the query
        const [receipts, categories] = await Promise.all([
            prisma.receipt.findMany({
                include: {
                    items: {
                        include: {
                            category: true,
                        },
                    },
                },
            }),
            prisma.category.findMany({
                include: {
                    _count: {
                        select: {
                            items: true,
                        },
                    },
                },
            }),
        ]);

        // Use Claude to analyze the query and generate a response
        const message = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `Given this expense data, answer the following query:

        Receipts: ${JSON.stringify(receipts)}
        Categories: ${JSON.stringify(categories)}

        Query: "${query}"

        Provide a clear, concise answer with relevant numbers and insights. If the query involves calculations or trends, include those details.`
            }],
        });

        const response = {
            query,
            answer: message.content[0].text,
            data: {
                receipts,
                categories,
            },
        };

        res.json(response);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid query format' });
        }
        console.error('Error processing query:', error);
        res.status(500).json({ error: 'Failed to process query' });
    }
});

export default router; 