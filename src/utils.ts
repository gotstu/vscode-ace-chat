import * as fs from 'fs';
import * as path from 'path';

// Utility to load the base prompt from markdown file
export function loadBasePrompt(extensionPath: string): string {
	const basePromptPath = path.join(extensionPath, 'src', 'basePrompt.md');
	try {
		return fs.readFileSync(basePromptPath, 'utf-8');
	} catch (err) {
		return 'Base prompt could not be loaded.';
	}
}
// Utility to fetch PRD collections with isVisible true, returning id, name and tag of ProductCollection
export async function fetchCollections(): Promise<Array<{ id: number; name: string; tag: string }>> {
	const url = 'https://spex.se.com/api/version/1/collections';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch collections: ${response.status}`);
	}
	const data: unknown = await response.json();
	if (Array.isArray(data)) {
        return data
            .filter((item: any) =>
                typeof item === 'object' && item !== null &&
                item.type === 'PRD' && item.isVisible === true &&
                'id' in item && 'name' in item && 'tag' in item
            )
            .map((item: any) => ({
                id: item.id,
                name: item.name,
                tag: item.tag
            }));
	}
	throw new Error('Unexpected response format');
}
// Utility to fetch topic objects (id and name) for a given collectionId
export async function fetchTopics(collectionId: number): Promise<Array<{ id: number; name: string }>> {
	const url = `https://spex.se.com/api/version/1/collections/${collectionId}/topics`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch topics: ${response.status}`);
	}
	const data: unknown = await response.json();
	if (
		typeof data === 'object' &&
		data !== null &&
		'topics' in data &&
		Array.isArray((data as any).topics)
	) {
		return (data as any).topics
			.map((item: any) =>
				typeof item === 'object' && item !== null && 'id' in item && 'name' in item
					? { id: item.id, name: item.name }
					: undefined
			)
			.filter(Boolean);
	}
	throw new Error('Unexpected response format');
}
// Utility to fetch topic content by topic id and collection id
export async function fetchTopicContent(collectionId: number, topicId: number): Promise<string> {
	const url = `https://spex.se.com/api/version/1/collections/${collectionId}/topics/${topicId}/content/internal`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch topic content: ${response.status}`);
	}
	const data: unknown = await response.json();
	if (
		typeof data === 'object' &&
		data !== null &&
		'content' in data &&
		typeof (data as any).content === 'string'
	) {
		return (data as { content: string }).content;
	}
	throw new Error('Unexpected response format');
}
// Utility to fetch topic names from the API
export async function fetchTopicNames(): Promise<string[]> {
	const url = 'https://spex.se.com/api/version/1/collections/2/topics';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch topics: ${response.status}`);
	}
	const data: unknown = await response.json();
	// If the response is an object with a 'topics' array
	if (
		typeof data === 'object' &&
		data !== null &&
		'topics' in data &&
		Array.isArray((data as any).topics)
	) {
		return (data as { topics: Array<{ name: string }> }).topics
			.map((item) =>
				typeof item === 'object' && item !== null && 'name' in item && typeof item.name === 'string'
					? item.name
					: undefined
			)
			.filter(Boolean) as string[];
	}
	throw new Error('Unexpected response format');
}
