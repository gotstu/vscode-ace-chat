// Type definitions for SPEX search API results
export interface SpexSearchHighlight {
    content?: string[];
    sections?: string[];
    [key: string]: string[] | undefined;
}

export interface SpexSearchSection {
    h1?: string;
    h2?: string;
    h3?: string;
}

export interface SpexSearchResultItem {
    collectionId: string;
    collectionName: string | null;
    changesetId: string | null;
    topicId: string;
    topicName: string;
    metadata_storage_name: string;
    metadata_storage_path: string;
    ordinal_position: number | null;
    searchScore: number;
    sections: SpexSearchSection;
    highLights: SpexSearchHighlight;
    isInternal: string;
    isInternalBool: boolean;
}

export interface SpexSearchResponse {
    totalCount: number;
    data: SpexSearchResultItem[];
}