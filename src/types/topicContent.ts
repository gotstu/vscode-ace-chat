// Interface for topic content as found in topic-content.json
export interface TopicContent {
    collectionId: number;
    lastUpdatedDate: string;
    id: number;
    name: string;
    content: string;
    isInternal: boolean;
    lockedBy: string | null;
    status: string;
}
