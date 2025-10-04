import * as z from "zod";

export const cardFaceSchema = z.object({
    name: z.string(),
    manaCost: z.string().optional(),
    typeLine: z.string().optional(),
    oracleText: z.string().optional(),
    colors: z.array(z.string()).optional(),
    power: z.string().optional(),
    toughness: z.string().optional(),
    imageUris: z.object({
        png: z.string().optional(),
    }).optional(),
});

export const cardSchema = z.object({
    idInternal: z.number().optional(),
    interestRating: z.enum(["interesting", "not_interesting"]).nullable()
        .optional(),
    id: z.string(),
    oracleId: z.string(),
    name: z.string(),
    oracleText: z.string().optional(),
    manaCost: z.string().optional(),
    cmc: z.number().optional(),
    typeLine: z.string().optional(),
    rarity: z.string().optional(),
    prices: z.object({
        usd: z.string().optional(),
    }).optional(),
    keywords: z.array(z.string()).optional(),
    set: z.string(),
    setName: z.string(),
    imageUris: z.object({
        png: z.string().optional(),
    }).optional(),
    power: z.string().optional(),
    toughness: z.string().optional(),
    cardFaces: z.array(cardFaceSchema).optional(),
    legalities: z.object({
        standard: z.string(),
        future: z.string(),
        historic: z.string(),
        timeless: z.string(),
        gladiator: z.string(),
        pioneer: z.string(),
        modern: z.string(),
        legacy: z.string(),
        pauper: z.string(),
        vintage: z.string(),
        penny: z.string(),
        commander: z.string(),
        oathbreaker: z.string(),
        standardbrawl: z.string(),
        brawl: z.string(),
        alchemy: z.string(),
        paupercommander: z.string(),
        duel: z.string(),
        oldschool: z.string(),
        premodern: z.string(),
        predh: z.string(),
    }),
    artist: z.string().optional(),
    releasedAt: z.string(),
});

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
    idInternal?: number;
    interestRating?: "interesting" | "not_interesting" | null;

    id: string;
    oracleId: string;
    name: string;
    oracleText?: string;
    manaCost?: string;
    cmc?: number;
    typeLine?: string;
    rarity?: string;
    prices?: {
        usd?: string;
    };
    keywords?: string[];
    set: string;
    setName: string;
    imageUris?: {
        png: string;
    };
    power?: string;
    toughness?: string;
    cardFaces?: CardFace[];
    legalities: {
        standard: string;
        future: string;
        historic: string;
        timeless: string;
        gladiator: string;
        pioneer: string;
        modern: string;
        legacy: string;
        pauper: string;
        vintage: string;
        penny: string;
        commander: string;
        oathbreaker: string;
        standardbrawl: string;
        brawl: string;
        alchemy: string;
        paupercommander: string;
        duel: string;
        oldschool: string;
        premodern: string;
        predh: string;
    };
    artist?: string;
    releasedAt: string;
};

async function niceFetch(url: string): Promise<any> {
    let currentUrl = url;
    let collectedData: Array<any> = [];

    while (currentUrl) {
        await new Promise((resolve) => setTimeout(resolve, 50)); // be nice to Scryfall API

        try {
            const response = await fetch(currentUrl);

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const data = await response.json();
            collectedData = collectedData.concat(data["data"]);
            // console.log(`Fetched ${collectedData.length} items so far...`);

            if (data["has_more"] && data["next_page"]) {
                currentUrl = data["next_page"];
            } else {
                currentUrl = "";
            }
        } catch (error) {
            throw new Error(`Fetch error: ${error}`);
        }
    }

    return collectedData;
}

export class ScryfallData {
    url: string;
    query: string = "";
    response?: Array<Card>;

    constructor(url: string) {
        this.url = url;
    }

    withQuery(query: string) {
        const params = new URLSearchParams({
            order: "released",
            game: "paper",
            q: query,
        });

        this.query = params.toString();

        return this;
    }

    async fetchData() {
        const data = await niceFetch(this.url + this.query);
        console.log(`Fetched ${data.length} items from Scryfall API.`);

        let converted: Array<Card> = [];

        for (const card of data) {
            const cardFaceList = card["card_faces"]?.map((face: any) => ({
                name: face["name"],
                manaCost: face["mana_cost"],
                typeLine: face["type_line"],
                oracleText: face["oracle_text"],
                colors: face["colors"],
                power: face["power"],
                toughness: face["toughness"],
                imageUris: {
                    png: face["image_uris"]?.["png"],
                },
            }));

            converted.push({
                cardFaces: cardFaceList,

                id: card["id"],
                oracleId: card["oracle_id"],
                name: card["name"],
                oracleText: card["oracle_text"],
                manaCost: card["mana_cost"],
                cmc: card["cmc"],
                typeLine: card["type_line"],
                rarity: card["rarity"],
                imageUris: {
                    png: card["image_uris"]?.["png"],
                },
                prices: {
                    usd: card["prices"]?.["usd"],
                },
                keywords: card["keywords"],
                set: card["set"],
                setName: card["set_name"],
                power: card["power"],
                toughness: card["toughness"],
                legalities: {
                    standard: card["legalities"]["standard"],
                    future: card["legalities"]["future"],
                    historic: card["legalities"]["historic"],
                    timeless: card["legalities"]["timeless"],
                    gladiator: card["legalities"]["gladiator"],
                    pioneer: card["legalities"]["pioneer"],
                    modern: card["legalities"]["modern"],
                    legacy: card["legalities"]["legacy"],
                    pauper: card["legalities"]["pauper"],
                    vintage: card["legalities"]["vintage"],
                    penny: card["legalities"]["penny"],
                    commander: card["legalities"]["commander"],
                    oathbreaker: card["legalities"]["oathbreaker"],
                    standardbrawl: card["legalities"]["standardbrawl"],
                    brawl: card["legalities"]["brawl"],
                    alchemy: card["legalities"]["alchemy"],
                    paupercommander: card["legalities"]["paupercommander"],
                    duel: card["legalities"]["duel"],
                    oldschool: card["legalities"]["oldschool"],
                    premodern: card["legalities"]["premodern"],
                    predh: card["legalities"]["predh"],
                },
                artist: card["artist"],
                releasedAt: card["released_at"],
            });
        }

        this.response = converted;

        return this.response;
    }
}

const data: Array<Card> = await new ScryfallData(
    "https://api.scryfall.com/cards/search?",
)
    .withQuery("is:commander game:paper legal:commander")
    .fetchData();

console.log("Example card:", data[0]);
