// Interface for a product as found in product.json
export interface Product {
    id: number;
    changesetStatus: string;
    status: string;
    topics: Array<{
        id: number;
        isInternal: boolean;
        lockedBy: string | null;
        status: string | null;
        tag: string;
        name: string;
        parentId: number;
        orderIndex: number;
    }>;
    changesetId: number;
    name: string;
    type: string;
    createdBy: string;
    lastUpdatedBy: string;
    lastUpdatedDate: string;
    tag: string;
    isVisible: boolean;
}
