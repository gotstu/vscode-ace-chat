import * as fs from 'fs';
import * as path from 'path';

// Utility to load the base prompt from markdown file
export function loadBasePrompt(extensionPath: string): string {
    const basePromptPath = path.join(extensionPath, 'src', 'basePrompt.md');
    try {
        return fs.readFileSync(basePromptPath, 'utf-8');
    } catch {
        return 'Base prompt could not be loaded.';
    }
}
// Utility to fetch PRD collections with isVisible true, returning id, name and tag of ProductCollection
export async function fetchCollections(): Promise<{ id: number; name: string; tag: string }[]> {
	const url = 'https://spex.se.com/api/version/1/collections';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch collections: ${response.status}`);
	}
	const data: unknown = await response.json();
	if (Array.isArray(data)) {
		return data
			.filter((item: unknown): item is { id: number; name: string; tag: string; type: string; isVisible: boolean } => {
				if (
					typeof item === 'object' && item !== null &&
					'type' in item && 'isVisible' in item &&
					'id' in item && 'name' in item && 'tag' in item
				) {
					const obj = item as { type: string; isVisible: boolean };
					return obj.type === 'PRD' && obj.isVisible === true;
				}
				return false;
			})
			.map((item) => ({
				id: item.id,
				name: item.name,
				tag: item.tag
			}));
	}
	throw new Error('Unexpected response format');
}
// Utility to fetch topic objects (id and name) for a given collectionId
export async function fetchTopics(collectionId: number): Promise<{ id: number; name: string }[]> {
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
		Array.isArray((data as { topics: unknown }).topics)
	) {
		return (data as { topics: unknown[] }).topics
			.map((item): { id: number; name: string } | undefined =>
				typeof item === 'object' && item !== null && 'id' in item && 'name' in item
					? { id: (item as { id: number }).id, name: (item as { name: string }).name }
					: undefined
			)
			.filter((item): item is { id: number; name: string } => Boolean(item));
	}
	throw new Error('Unexpected response format');
}

// Utility to fetch child topics for a given parent topic id and collection id
export async function fetchChildTopics(collectionId: number, parentId: number): Promise<{ id: number; name: string }[]> {
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
		Array.isArray((data as { topics: unknown }).topics)
	) {
		return (data as { topics: unknown[] }).topics
			.map((item): { id: number; name: string; parentId?: number } | undefined =>
				typeof item === 'object' && item !== null && 'id' in item && 'name' in item && 'parentId' in item
					? { id: (item as { id: number }).id, name: (item as { name: string }).name, parentId: (item as { parentId: number }).parentId }
					: undefined
			)
			.filter((item): item is { id: number; name: string; parentId?: number } => item !== undefined && item.parentId === parentId)
			.map(({ id, name }) => ({ id, name }));
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
		typeof (data as { content: unknown }).content === 'string'
	) {
		return (data as { content: string }).content;
	}
	throw new Error('Unexpected response format');
}
// Utility to fetch topic names and parentId from the API
export async function fetchTopicNames(): Promise<{ name: string; parentId: number | null }[]> {
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
		Array.isArray((data as { topics: unknown }).topics)
	) {
		return (data as { topics: unknown[] }).topics
			.map((item): { name: string; parentId: number | null } | undefined => {
				if (
					typeof item === 'object' && item !== null &&
					'name' in item && typeof (item as { name: unknown }).name === 'string' &&
					'parentId' in item
				) {
					return {
						name: (item as { name: string }).name,
						parentId: (item as { parentId: number | null }).parentId ?? null
					};
				}
				return undefined;
			})
			.filter((topic): topic is { name: string; parentId: number | null } => Boolean(topic));
	}
	throw new Error('Unexpected response format');
}
