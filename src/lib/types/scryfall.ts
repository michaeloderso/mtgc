export type ScryfallResponse = {
    object: string;
    totalCards: number;
    has_more: boolean;
    next_page?: string;
    data: Card[];
};

export type CardFace = {
    name: string;
    manaCost?: string;
    typeLine?: string;
    oracleText?: string;
    colors?: string[];
    power?: string;
    toughness?: string;
    imageUris?: {
        png: string;
    };
};

export type Card = {
    idInternal: number;
    id: string;
    oracleId: string;
    name: string;
    oracleText?: string;
    manaCost?: string;
    cmc?: number;
    typeLine?: string;
    rarity?: string;
    imageUriPng?: string;
    prices?: {
        usd?: string;
    };
    keywords?: string[];
    set: string;
    setName: string;
    setCode: string;
    imageUris?: {
        png: string;
    };
    power?: string;
    toughness?: string;
    cardFaces?: CardFace[];
    interestRating?: "interesting" | "not_interesting" | null;
    legalities: Record<string, string>;
    artist?: string;
    releasedAt: string;
};
