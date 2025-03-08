import { Anthropic } from '@anthropic-ai/sdk';

// Create a singleton instance of Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export default anthropic; 