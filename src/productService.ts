import { fetchCollections, fetchTopics, fetchChildTopics } from './utils';

export async function getProductCollection() {
    return await fetchCollections();
}

export async function getTopics(collectionId: number) {
    return await fetchTopics(collectionId);
}

export async function getChildTopics(collectionId: number, topicId: number) {
    return await fetchChildTopics(collectionId, topicId);
}
