import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../services/db';
import { processReceiptImage, parseReceiptText } from '../services/ai/receiptProcessor';
import { receiptUpdateSchema, manualReceiptSchema } from '../services/schemas';
import { ZodError } from 'zod';

const router = express.Router();

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
        const data = receiptUpdateSchema.parse(req.body);

        // Handle shop update
        let shopId = data.shopId;
        if (data.shop) {
            if (data.shop.id) {
                // Update existing shop
                await prisma.shop.update({
                    where: { id: data.shop.id },
                    data: {
                        name: data.shop.name,
                        address: data.shop.address,
                    },
                });
                shopId = data.shop.id;
            } else {
                // Create new shop
                const shop = await prisma.shop.create({
                    data: {
                        name: data.shop.name,
                        address: data.shop.address,
                    },
                });
                shopId = shop.id;
            }
        }

        // Update receipt
        const receipt = await prisma.receipt.update({
            where: { id: req.params.id },
            data: {
                date: new Date(data.date),
                totalAmount: data.totalAmount,
                shopId,
            },
            include: {
                items: true,
            },
        });

        // Get existing items to determine which to update/delete
        const existingItemIds = receipt.items.map(item => item.id);
        const updatedItemIds = data.items.map(item => item.id);

        // Items to delete (in existing but not in updated)
        const itemsToDelete = existingItemIds.filter(id => !updatedItemIds.includes(id));

        // Delete items
        if (itemsToDelete.length > 0) {
            await prisma.item.deleteMany({
                where: {
                    id: {
                        in: itemsToDelete,
                    },
                },
            });
        }

        // Update or create items
        for (const item of data.items) {
            if (existingItemIds.includes(item.id)) {
                // Update existing item
                await prisma.item.update({
                    where: { id: item.id },
                    data: {
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        categoryId: item.categoryId,
                    },
                });
            } else {
                // Create new item
                await prisma.item.create({
                    data: {
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        categoryId: item.categoryId,
                        receiptId: receipt.id,
                    },
                });
            }
        }

        // Fetch updated receipt with all relations
        const updatedReceipt = await prisma.receipt.findUnique({
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

        res.json(updatedReceipt);
    } catch (error) {
        console.error('Error updating receipt:', error);
        if (error instanceof ZodError) {
            return res.status(400).json({ error: 'Invalid receipt data', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update receipt' });
    }
});

// Delete receipt
router.delete('/:id', async (req, res) => {
    try {
        // First delete all items associated with the receipt
        await prisma.item.deleteMany({
            where: { receiptId: req.params.id },
        });

        // Then delete the receipt
        await prisma.receipt.delete({
            where: { id: req.params.id },
        });

        res.status(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        res.status(500).json({ error: 'Failed to delete receipt' });
    }
});

// Create receipt manually
router.post('/manual', async (req, res) => {
    try {
        const data = manualReceiptSchema.parse(req.body);

        // Find or create shop
        let shop = await prisma.shop.findUnique({
            where: { name: data.shopName },
        });

        if (!shop) {
            shop = await prisma.shop.create({
                data: { name: data.shopName },
            });
        }

        // Create receipt
        const receipt = await prisma.receipt.create({
            data: {
                date: new Date(data.date),
                totalAmount: data.totalAmount,
                shopId: shop.id,
                imageUrl: '', // No image for manual entries
                rawImagePath: '', // No raw image for manual entries
                items: {
                    create: data.items.map(item => ({
                        name: item.name,
                        price: item.price,
                        quantity: 1,
                        categoryId: item.categoryId || '',
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

        res.status(201).json(receipt);
    } catch (error) {
        console.error('Error creating manual receipt:', error);
        if (error instanceof ZodError) {
            return res.status(400).json({ error: 'Invalid receipt data', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create receipt' });
    }
});

export default router; 