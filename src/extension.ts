import * as vscode from 'vscode';
import { loadBasePrompt, fetchCollections, fetchTopics, fetchTopicContent, fetchSpexSearchResults } from './utils/spex';

let productCollection: { id: number; name: string; tag: string }[] = [];
const debugMode = false; // Set to true to enable debug output
const confidenceThreshold = 0.1;
// Simple in-memory cache for search responses
const searchCache = new Map<string, { ts: number; data: import('./types/searchResult').SpexSearchResponse }>();

function sanitizeSnippet(text: string): string {
	return text
		.replace(/<\/?[^>]+>/g, '') // strip HTML tags
		.replace(/\s+/g, ' ') // collapse whitespace
		.trim()
		.slice(0, 1200); // cap length sent to model
}

export async function activate(context: vscode.ExtensionContext) {
	productCollection = await fetchCollections(); // Fetch once and store globally
	const BASE_PROMPT = getBasePrompt(context);
	const handler: vscode.ChatRequestHandler = createChatHandler(BASE_PROMPT);
	const tutor = vscode.chat.createChatParticipant("ace-chat.helper", handler);
	tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, 'schneider.jpg');
}

function getBasePrompt(context: vscode.ExtensionContext): string {
	return loadBasePrompt(context.extensionPath);
}

function createChatHandler(BASE_PROMPT: string): vscode.ChatRequestHandler {
	// Map of command name to handler function
	const commandHandlers: Record<string, (
		request: vscode.ChatRequest,
		chatContext: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
		userPrompt: string
	) => Promise<void>> = {
		spex: handleSpexCommand,
		spexsearch: handleSpexSearchCommand
		// Add more commands here, e.g. 'other': handleOtherCommand
	};

	return async (request, chatContext, stream, token) => {
		// Use request.command if available, otherwise fallback to old parsing for backward compatibility
		let command: string | undefined;
		let userPrompt = '';
		if (request.command) {
			command = request.command.toLowerCase();
			userPrompt = request.prompt;
		}

		if (!command) {
			stream.markdown('Please use a supported command (e.g., `/spex`).');
			return;
		}
		const handler = commandHandlers[command];

		await handler(request, chatContext, stream, token, userPrompt);
	};

	// Handler for /spexsearch command (lightweight: uses search highlight snippets only)
	async function handleSpexSearchCommand(
		request: vscode.ChatRequest,
		_chatContext: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
		userPrompt: string
	) {
		const query = userPrompt.trim();
		if (!query) {
			stream.markdown('Provide a search query after `/spexsearch`.');
			return;
		}
		const cacheKey = query.toLowerCase();
		let cached = searchCache.get(cacheKey);
		if (!cached || (Date.now() - cached.ts) > 5 * 60_000) { // 5 min cache
			try {
				const data = await fetchSpexSearchResults(query, 1, 12);
				cached = { ts: Date.now(), data };
				searchCache.set(cacheKey, cached);
			} catch (err) {
				stream.markdown('Search failed.');
				if (debugMode) { stream.markdown(String(err)); }
				return;
			}
		}
		const resp = cached.data;
		if (!resp || resp.totalCount === 0) {
			stream.markdown('No results found.');
			return;
		}
		const topItems = resp.data.slice(0, 5);
		stream.markdown(`Found ${resp.totalCount} results. Showing top ${topItems.length}:`);
		topItems.forEach((r, i) => {
			const url = `https://spex.se.com/ui/docs?collectionId=${r.collectionId}&topicId=${r.topicId}`;
			stream.markdown(`${i + 1}. [${r.topicName}](${url}) (score: ${r.searchScore.toFixed(2)})`);
		});
		// Build highlight-only prompt
		const snippetBlocks = topItems.map(r => {
			const highlightArrays = Object.values(r.highLights || {}).flat();
			const highlights = sanitizeSnippet(highlightArrays.slice(0, 3).join('\n'));
			return `Topic: ${r.topicName}\nHighlights:\n${highlights}`;
		}).join('\n---\n');
		const answerPrompt = `Use ONLY the provided SPEX search highlight snippets to answer the user.\nUser Query: ${query}\nSnippets:\n${snippetBlocks}\nReturn a concise answer. If insufficient, say you need a more specific query.`;
		if (debugMode) {
			stream.markdown('**Search Answer Prompt:**');
			stream.markdown('```text\n' + answerPrompt + '\n```');
		}
		try {
			const messages = [vscode.LanguageModelChatMessage.User(answerPrompt)];
			const answerResp = await request.model.sendRequest(messages, {}, token);
			let answer = '';
			for await (const frag of answerResp.text) { answer += frag; }
			stream.markdown('\n**Answer:**\n' + answer);
		} catch (err) {
			stream.markdown('LLM generation failed for search answer.');
			if (debugMode) { stream.markdown(String(err)); }
		}
	}

	// Handler for /spex command (full product/topic workflow)
	async function handleSpexCommand(
		request: vscode.ChatRequest,
		chatContext: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
		userPrompt: string
	) {
		if (!productCollection || productCollection.length === 0) {
			stream.markdown('Product collections not loaded.');
			return;
		}

		const identifyPrompt = `${BASE_PROMPT}\n\nProduct Collection:\n${JSON.stringify(productCollection, null, 2)}\n\nUser Prompt: ${userPrompt}\n\nTask: Only identify the product(s) from the collection that the user is referring to. Do not provide any other information. Return your answer as a JSON array of objects with "id", "name", "tag", and "confidence" fields.`;

		if (debugMode) {
			stream.markdown('**LLM Prompt:**');
			stream.markdown('```text\n' + identifyPrompt + '\n```');
		}

		const messages = [
			vscode.LanguageModelChatMessage.User(identifyPrompt)
		];

		const chatResponse = await request.model.sendRequest(messages, {}, token);
		let responseText = '';
		if (debugMode) {
			stream.markdown('**LLM Raw Response:**');
		}
		for await (const fragment of chatResponse.text) {
			responseText += fragment;
			if (debugMode) { stream.markdown(fragment); } // Stream fragments as they arrive
		}

		let products: { id: number; name: string; tag: string; confidence: number }[] = [];
		try {
			const match = responseText.match(/\[.*\]/s);
			if (match) {
				products = JSON.parse(match[0]);
				if (debugMode) {
					stream.markdown('**Parsed Products:**\n```json\n' + JSON.stringify(products, null, 2) + '\n```');
				}
			}
		} catch {
			stream.markdown('Could not parse product identification.');
			return;
		}

		// Prevent proceeding if all products have low or near-zero confidence
		const highestConfidence = products.reduce((max, p) => Math.max(max, p.confidence), 0);
		if (highestConfidence < confidenceThreshold) {
			stream.markdown('I am not confident about which product you are referring to. Please clarify your request or choose from the following products:\n');
			productCollection.forEach((product, idx) => {
				stream.markdown(`${idx + 1}. ${product.name} (id: ${product.id})\n`);
			});
			return;
		}

		if (!products || products.length === 0) {
			stream.markdown('You did not provide a topic I can help with. Here are the products I can help with:\n');
			productCollection.forEach((product, idx) => {
				stream.markdown(`${idx + 1}. ${product.name} (id: ${product.id})\n`);
			});
			return;
		}

		const topProduct = products.sort((a, b) => b.confidence - a.confidence)[0];
		const collectionId = Number(topProduct.id);
		if (isNaN(collectionId)) {
			stream.markdown(`Product id "${topProduct.id}" is not a valid collection ID.`);
			return;
		}

		// Show confidence message before fetching topics
		stream.markdown(`I am confident you are asking about '${topProduct.name}' (confidence: ${topProduct.confidence}). I will fetch the topics now.\n\n`);

		// Search-assisted narrowing of topics
		let topics: { id: number; name: string }[] = [];
		try {
			topics = await fetchTopics(collectionId);
		} catch {
			stream.markdown(`Failed to fetch topics for ${topProduct.name}.`);
			return;
		}
		const searchTopicIds = new Set<number>();
		try {
			const searchData = await fetchSpexSearchResults(userPrompt, 1, 25);
			searchData.data.forEach(item => {
				if (item.collectionId === String(collectionId)) {
					const tid = Number(item.topicId);
					if (!Number.isNaN(tid)) { searchTopicIds.add(tid); }
				}
			});
			if (debugMode) {
				stream.markdown(`Search-derived topic IDs: ${Array.from(searchTopicIds).join(', ')}`);
			}
		} catch (err) {
			if (debugMode) { stream.markdown('Search narrowing failed: ' + String(err)); }
		}
		const narrowedTopics = searchTopicIds.size > 0 ? topics.filter(t => searchTopicIds.has(t.id)) : topics;
		if (narrowedTopics.length === 0) {
			stream.markdown('Search did not narrow any topics; using full topic list.');
		}
		// Ask LLM to pick top 3 topics relevant to the user prompt
		const topicPrompt = `Product: ${topProduct.name}\nTopics: ${JSON.stringify(narrowedTopics, null, 2)}\nUser Prompt: ${userPrompt}\n\nTask: From the topics above, identify the top 3 most relevant topics to the user's prompt. Return your answer as a JSON array of objects with "id", "name", and "confidence" as a number between 0 and 1.`;

		const topicMessages = [
			vscode.LanguageModelChatMessage.User(topicPrompt)
		];

		const topicResponse = await request.model.sendRequest(topicMessages, {}, token);

		let topicResponseText = '';
		if (debugMode) {
			stream.markdown('**LLM Topic Raw Response:**');
		}
		for await (const fragment of topicResponse.text) {
			topicResponseText += fragment;
			if (debugMode) { stream.markdown(fragment); }
		}

		let bestTopics: { id: number; name: string; confidence: number }[] = [];
		try {
			const match = topicResponseText.match(/\[.*\]/s);
			if (match) {
				bestTopics = JSON.parse(match[0]);
				if (debugMode) {
					stream.markdown('**Parsed Topics:**\n```json\n' + JSON.stringify(bestTopics, null, 2) + '\n```');
				}
			}
		} catch {
			stream.markdown('Could not parse topic identification.');
			return;
		}


		// Show the top relevant topics and their confidence to the user, with clickable links
		if (bestTopics && bestTopics.length > 0) {
			stream.markdown('**Top relevant topics:**\n');
			bestTopics.forEach((topic, idx) => {
				// Create an external URL for the topic documentation
				const topicUrl = `https://spex.se.com/ui/docs?collectionId=${collectionId}&topicId=${topic.id}`;
				stream.markdown(`${idx + 1}. [${topic.name}](${topicUrl}) (confidence: ${topic.confidence})\n`);
			});
		}

		// Fetch topic content for each best topic
		let topicContents: string[] = [];
		try {
			topicContents = await Promise.all(
				bestTopics.map(topic => fetchTopicContent(collectionId, topic.id))
			);
		} catch {
			stream.markdown('Failed to fetch topic content.');
			return;
		}

		// Build a prompt with topic content only, and strictly instruct the LLM to use ONLY topic content
		const summaryPrompt = `You are an expert assistant. Answer the user's prompt using ONLY the information provided in the "Topic Content" sections below. Do NOT use any outside knowledge, product collection data, or information not present in the topic content.\n\nUser Prompt: ${userPrompt}\n\nTopic Content:\n${topicContents.map((content, i) => `---\n${bestTopics[i].name}:\n${content}\n`).join('\n')}`;

		const summaryMessages = [
			vscode.LanguageModelChatMessage.User(summaryPrompt)
		];

		const summaryResponse = await request.model.sendRequest(summaryMessages, {}, token);

		let summaryText = '';
		for await (const fragment of summaryResponse.text) {
			summaryText += fragment;
		}
		stream.markdown(`\n\n**Summary:**\n\n${summaryText}\n`);
	}
}

export function deactivate() { }
