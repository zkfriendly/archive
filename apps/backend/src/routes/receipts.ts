import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// Schema for receipt data
const receiptSchema = z.object({
    date: z.string(),
    totalAmount: z.number(),
    items: z.array(z.object({
        name: z.string(),
        price: z.number(),
        quantity: z.number().optional(),
        category: z.string(),
    })),
});

// Process receipt image and extract data
async function processReceiptImage(imagePath: string) {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();
    return text;
}

// Use Claude to parse receipt text and extract structured data
async function parseReceiptText(text: string) {
    const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [{
            role: 'user',
            content: `Extract the following information from this receipt text in JSON format:
      - date
      - total amount
      - items (array of objects with name, price, and suggested category)
      
      Receipt text:
      ${text}
      
      Return only valid JSON.`
        }],
    });

    try {
        const jsonStr = message.content[0].text;
        return receiptSchema.parse(JSON.parse(jsonStr));
    } catch (error) {
        throw new Error('Failed to parse receipt data');
    }
}

// Upload and process receipt
router.post('/', upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const text = await processReceiptImage(req.file.path);
        const parsedData = await parseReceiptText(text);

        // Create receipt and items in database
        const receipt = await prisma.receipt.create({
            data: {
                imageUrl: `/uploads/${req.file.filename}`,
                date: new Date(parsedData.date),
                totalAmount: parsedData.totalAmount,
                items: {
                    create: await Promise.all(parsedData.items.map(async (item) => {
                        // Get or create category
                        const category = await prisma.category.upsert({
                            where: { name: item.category },
                            create: { name: item.category },
                            update: {},
                        });

                        return {
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity || 1,
                            categoryId: category.id,
                        };
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        res.json(receipt);
    } catch (error) {
        console.error('Error processing receipt:', error);
        res.status(500).json({ error: 'Failed to process receipt' });
    }
});

// Get all receipts
router.get('/', async (req, res) => {
    try {
        const receipts = await prisma.receipt.findMany({
            include: {
                items: {
                    include: {
                        category: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });
        res.json(receipts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

// Get receipt by ID
router.get('/:id', async (req, res) => {
    try {
        const receipt = await prisma.receipt.findUnique({
            where: { id: req.params.id },
            include: {
                items: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        res.json(receipt);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch receipt' });
    }
});

export default router; 