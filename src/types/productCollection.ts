// Interface for a product collection as found in collections.json and API
export interface ProductCollection {
    id: number;
    topicsCount: number;
    changesetId: number;
    name: string;
    type: string;
    createdBy: string;
    lastUpdatedBy: string;
    lastUpdatedDate: string;
    tag: string;
    isVisible: boolean;
}
