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

// Schema for receipt update
const receiptUpdateSchema = z.object({
    id: z.string(),
    date: z.string(),
    totalAmount: z.number(),
    shopId: z.string().optional().nullable(),
    shop: z.object({
        id: z.string().optional(),
        name: z.string(),
        address: z.string().optional().nullable(),
    }).optional().nullable(),
    items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
        categoryId: z.string(),
        category: z.object({
            id: z.string(),
            name: z.string(),
        }).optional(),
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

// Update receipt
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = receiptUpdateSchema.parse(req.body);

        // Check if receipt exists
        const existingReceipt = await prisma.receipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!existingReceipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Handle shop update
        let shopId = data.shopId;
        if (data.shop) {
            // If shop has an ID, use it
            if (data.shop.id) {
                shopId = data.shop.id;

                // Update shop if needed
                await prisma.shop.update({
                    where: { id: data.shop.id },
                    data: {
                        name: data.shop.name,
                        address: data.shop.address
                    }
                });
            } else {
                // Check if shop with this name already exists
                const existingShop = await prisma.shop.findUnique({
                    where: { name: data.shop.name }
                });

                if (existingShop) {
                    shopId = existingShop.id;

                    // Update address if provided and different
                    if (data.shop.address && existingShop.address !== data.shop.address) {
                        await prisma.shop.update({
                            where: { id: existingShop.id },
                            data: { address: data.shop.address }
                        });
                    }
                } else {
                    // Create new shop
                    const newShop = await prisma.shop.create({
                        data: {
                            name: data.shop.name,
                            address: data.shop.address
                        }
                    });
                    shopId = newShop.id;
                }
            }
        } else if (data.shopId === null) {
            // If shopId is explicitly set to null, remove the shop association
            shopId = null;
        }

        // Get existing item IDs to determine which to delete
        const existingItemIds = new Set(existingReceipt.items.map(item => item.id));
        const updatedItemIds = new Set(data.items.map(item => item.id));

        // Items to delete (existing but not in updated list)
        const itemsToDelete = [...existingItemIds].filter(id => !updatedItemIds.has(id) && !id.startsWith('temp-'));

        // Items to create (new items with temp IDs)
        const itemsToCreate = data.items.filter(item => item.id.startsWith('temp-'));

        // Items to update (existing and in updated list)
        const itemsToUpdate = data.items.filter(item => existingItemIds.has(item.id));

        // Update receipt with transaction to ensure all operations succeed or fail together
        const updatedReceipt = await prisma.$transaction(async (tx) => {
            // Delete removed items
            if (itemsToDelete.length > 0) {
                await tx.item.deleteMany({
                    where: {
                        id: { in: itemsToDelete }
                    }
                });
            }

            // Create new items
            for (const item of itemsToCreate) {
                await tx.item.create({
                    data: {
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        categoryId: item.categoryId,
                        receiptId: id
                    }
                });
            }

            // Update existing items
            for (const item of itemsToUpdate) {
                await tx.item.update({
                    where: { id: item.id },
                    data: {
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        categoryId: item.categoryId
                    }
                });
            }

            // Update receipt
            return tx.receipt.update({
                where: { id },
                data: {
                    date: new Date(data.date),
                    totalAmount: data.totalAmount,
                    shopId
                },
                include: {
                    items: {
                        include: {
                            category: true
                        }
                    },
                    shop: true
                }
            });
        });

        res.json(updatedReceipt);
    } catch (error) {
        console.error('Error updating receipt:', error);
        res.status(500).json({ error: 'Failed to update receipt' });
    }
});

// Delete receipt
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if receipt exists
        const receipt = await prisma.receipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Delete receipt and associated items in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete all items first
            await tx.item.deleteMany({
                where: { receiptId: id }
            });

            // Delete the receipt
            await tx.receipt.delete({
                where: { id }
            });

            // Optionally delete image files
            try {
                const uploadDir = path.join(__dirname, '..', '..');
                if (receipt.imageUrl) {
                    const imagePath = path.join(uploadDir, receipt.imageUrl);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }

                if (receipt.rawImagePath) {
                    const rawImagePath = path.join(uploadDir, receipt.rawImagePath);
                    if (fs.existsSync(rawImagePath)) {
                        fs.unlinkSync(rawImagePath);
                    }
                }
            } catch (fileError) {
                console.error('Error deleting receipt image files:', fileError);
                // Continue with deletion even if file removal fails
            }
        });

        res.json({ success: true, message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error('Error deleting receipt:', error);
        res.status(500).json({ error: 'Failed to delete receipt' });
    }
});

// Recalculate receipt from original image
router.post('/:id/recalculate', async (req, res) => {
    try {
        const { id } = req.params;

        // Find receipt with raw image path
        const receipt = await prisma.receipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        if (!receipt.rawImagePath) {
            return res.status(400).json({ error: 'No raw image available for recalculation' });
        }

        // Get the full path to the raw image
        const uploadDir = path.join(__dirname, '..', '..');
        const rawImagePath = path.join(uploadDir, receipt.rawImagePath);

        if (!fs.existsSync(rawImagePath)) {
            return res.status(400).json({ error: 'Raw image file not found' });
        }

        // Process the raw image again
        const text = await processReceiptImage(rawImagePath);
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

        // Update receipt with transaction
        const updatedReceipt = await prisma.$transaction(async (tx) => {
            // Delete all existing items
            await tx.item.deleteMany({
                where: { receiptId: id }
            });

            // Update receipt
            const updated = await tx.receipt.update({
                where: { id },
                data: {
                    date: new Date(parsedData.date),
                    totalAmount: parsedData.totalAmount,
                    shopId: shop?.id,
                    items: {
                        create: await Promise.all(parsedData.items.map(async (item) => {
                            let categoryId: string;
                            const normalizedCategoryName = item.category.toLowerCase();

                            // Check if category already exists
                            if (categoryMap.has(normalizedCategoryName)) {
                                const catId = categoryMap.get(normalizedCategoryName);
                                if (catId) {
                                    categoryId = catId;
                                } else {
                                    // Fallback if somehow the ID is undefined
                                    let defaultCategory = await tx.category.findFirst({
                                        where: { name: "Miscellaneous" }
                                    });

                                    if (!defaultCategory) {
                                        defaultCategory = await tx.category.create({
                                            data: { name: "Miscellaneous" }
                                        });
                                    }

                                    categoryId = defaultCategory.id;
                                }
                            } else {
                                // Create new category if it doesn't exist
                                const newCategory = await tx.category.create({
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

            return updated;
        });

        res.json(updatedReceipt);
    } catch (error) {
        console.error('Error recalculating receipt:', error);
        res.status(500).json({ error: 'Failed to recalculate receipt' });
    }
});

export default router; 