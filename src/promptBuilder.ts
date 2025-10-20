import { Product } from './types/product';

export interface Topic {
    id: number;
    name: string;
    confidence?: number;
}

export function buildIdentifyPrompt(basePrompt: string, products: Product[], userPrompt: string) {
    return `${basePrompt}

Product Collection:
${JSON.stringify(products, null, 2)}

User Prompt: ${userPrompt}

Task: Only identify the product(s) from the collection that the user is referring to. Do not provide any other information. Return your answer as a JSON array of objects with "id", "name", "tag", and "confidence" fields.`;
}

export function buildTopicPrompt(productName: string, topics: Topic[], userPrompt: string) {
    return `Product: ${productName}
Topics: ${JSON.stringify(topics, null, 2)}
User Prompt: ${userPrompt}

Task: From the topics above, identify the top 3 most relevant topics to the user's prompt. Return your answer as a JSON array of objects with "id", "name", and "confidence" as a number between 0 and 1.`;
}

export function buildSummaryPrompt(userPrompt: string, bestTopics: Topic[]) {
    return `
You are an expert assistant. Based on the following topics and the user's prompt, provide a concise summary or answer for the user. Reference the topics as needed, but do not include their full content.

User Prompt: ${userPrompt}
Best Topics: ${JSON.stringify(bestTopics, null, 2)}

Task: Write a summary or answer for the user, referencing the topics above as supporting links.`;
}
