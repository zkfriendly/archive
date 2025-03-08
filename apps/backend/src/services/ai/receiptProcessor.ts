import { createWorker } from 'tesseract.js';
import anthropic from './client';
import prisma from '../db';
import { receiptSchema } from '../schemas';

// Process receipt image and extract data
export async function processReceiptImage(imagePath: string): Promise<string> {
    const worker = await createWorker();
    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();
    return text;
}

// Use Claude to parse receipt text and extract structured data
export async function parseReceiptText(text: string) {
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