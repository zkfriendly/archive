import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { z } from 'zod';
import fs from 'fs';

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
    shop: z.object({
        name: z.string(),
        address: z.string().optional(),
    }),
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
    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();
    return text;
}

// Use Claude to parse receipt text and extract structured data
async function parseReceiptText(text: string) {
    // Get existing categories to provide as examples
    const existingCategories = await prisma.category.findMany();
    const categoryNames = existingCategories.map(c => c.name).join(', ');

    // Get existing shops to provide as examples
    const existingShops = await prisma.shop.findMany();
    const shopNames = existingShops.map(s => s.name).join(', ');

    const message = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1024,
        messages: [{
            role: 'user',
            content: `Extract the following information from this receipt text in JSON format:

Receipt schema:
{
  "date": "YYYY-MM-DD", // Required: Must be a valid date string
  "totalAmount": 123.45, // Required: Must be a number
  "shop": {
    "name": "Shop Name", // Required: String
    "address": "Shop Address" // Optional: String
  },
  "items": [ // Required: Array of items
    {
      "name": "Item name", // Required: String
      "price": 12.34, // Required: Number
      "quantity": 1, // Optional: Number (defaults to 1)
      "category": "Category name" // Required: String matching one of our existing categories when possible
    }
  ]
}

Existing categories in our system: ${categoryNames || "Groceries, Electronics, Clothing, Restaurant, Household, Miscellaneous"}
Existing shops in our system: ${shopNames || "None yet"}

If you cannot determine a specific field, use a reasonable default:
- For missing date, use today's date
- For missing total, sum the prices of all items
- For missing shop name, use "Unknown Shop"
- For missing category, classify based on the item name using one of our existing categories
- Always include all required fields

Receipt text:
${text}

Return ONLY valid JSON matching the schema above.
Do not include any markdown formatting, explanations, or additional text.`
        }],
    });

    // Handle potential markdown formatting in the response
    let jsonStr = message.content[0].text;
    jsonStr = jsonStr.replace(/```json\s*|\s*```/g, '').trim();

    try {
        const parsedJson = JSON.parse(jsonStr);

        // Ensure all required fields exist with fallbacks
        const validatedData = {
            date: parsedJson.date || new Date().toISOString().split('T')[0],
            totalAmount: parsedJson.totalAmount ||
                (parsedJson.items?.reduce((sum: number, item: any) => sum + (item.price || 0), 0) || 0),
            shop: {
                name: parsedJson.shop?.name || "Unknown Shop",
                address: parsedJson.shop?.address || null
            },
            items: (parsedJson.items || []).map((item: any) => ({
                name: item.name || "Unknown Item",
                price: item.price || 0,
                quantity: item.quantity || 1,
                category: item.category || "Miscellaneous"
            }))
        };

        return receiptSchema.parse(validatedData);
    } catch (error) {
        console.error("Error parsing JSON from Claude:", error);
        console.log("Raw response:", jsonStr);
        throw new Error("Failed to parse receipt data");
    }
}

// Upload and process receipt
router.post('/', upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Store the raw image
        const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
        const rawImageFilename = `raw-${req.file.filename}`;
        const rawImagePath = path.join(uploadDir, rawImageFilename);

        // Copy the uploaded file to create a raw image backup
        fs.copyFileSync(req.file.path, rawImagePath);

        const text = await processReceiptImage(req.file.path);
        const parsedData = await parseReceiptText(text);

        // Pre-fetch all categories to avoid multiple database queries
        const existingCategories = await prisma.category.findMany();
        const categoryMap = new Map(existingCategories.map(cat => [cat.name.toLowerCase(), cat.id]));

        // Find or create shop
        let shop = null;
        if (parsedData.shop.name !== "Unknown Shop") {
            shop = await prisma.shop.findUnique({
                where: { name: parsedData.shop.name }
            });

            if (!shop) {
                shop = await prisma.shop.create({
                    data: {
                        name: parsedData.shop.name,
                        address: parsedData.shop.address
                    }
                });
            } else if (parsedData.shop.address && !shop.address) {
                // Update shop with address if it was missing before
                shop = await prisma.shop.update({
                    where: { id: shop.id },
                    data: { address: parsedData.shop.address }
                });
            }
        }

        // Create receipt and items in database
        const receipt = await prisma.receipt.create({
            data: {
                imageUrl: `/uploads/${req.file.filename}`,
                rawImagePath: `/uploads/${rawImageFilename}`,
                date: new Date(parsedData.date),
                totalAmount: parsedData.totalAmount,
                shopId: shop?.id,
                items: {
                    create: await Promise.all(parsedData.items.map(async (item) => {
                        let categoryId: string;
                        const normalizedCategoryName = item.category.toLowerCase();

                        // Check if category already exists
                        if (categoryMap.has(normalizedCategoryName)) {
                            const id = categoryMap.get(normalizedCategoryName);
                            if (id) {
                                categoryId = id;
                            } else {
                                // Fallback if somehow the ID is undefined
                                let defaultCategory = await prisma.category.findFirst({
                                    where: { name: "Miscellaneous" }
                                });

                                if (!defaultCategory) {
                                    defaultCategory = await prisma.category.create({
                                        data: { name: "Miscellaneous" }
                                    });
                                }

                                categoryId = defaultCategory.id;
                            }
                        } else {
                            // Create new category if it doesn't exist
                            const newCategory = await prisma.category.create({
                                data: { name: item.category }
                            });
                            categoryId = newCategory.id;
                            // Update our local map
                            categoryMap.set(normalizedCategoryName, newCategory.id);
                        }

                        return {
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity || 1,
                            categoryId: categoryId,
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
                shop: true,
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
                shop: true,
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
                shop: true,
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