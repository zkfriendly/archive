import { z } from 'zod';

// Schema for receipt data
export const receiptSchema = z.object({
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
export const receiptUpdateSchema = z.object({
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

// Schema for manual receipt data
export const manualReceiptSchema = z.object({
    date: z.string(),
    shopName: z.string(),
    items: z.array(z.object({
        name: z.string(),
        price: z.number(),
        categoryId: z.string().optional(),
    })),
    totalAmount: z.number(),
});

// Schema for query request
export const querySchema = z.object({
    query: z.string().min(1),
}); 