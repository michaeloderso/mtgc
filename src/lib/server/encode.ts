import type { Card } from '$lib/types/scryfall';

export function prepareQuery(query: string): string {
    const params = new URLSearchParams({
        order: "released",
        game: "paper",
        q: query
    });

    return "https://api.scryfall.com/cards/search?" + params.toString();
}

async function goodCitizenFetch(url: string): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50)); // be nice to Scryfall API

  return fetch(url)
    .then((r) => r.json());
  }


export async function multiPageQuery(url: string): Promise<Array<Card>> {
  const collected_data: Array<Card> = [];

  async function scryfallQuery(searchUrl: string): Promise<void> {
    const d = await goodCitizenFetch(searchUrl);


    collected_data.push(...d.data);

    if (d["has_more"] && d["next_page"]) {
      console.log("Collected data so far:", collected_data.length);
      await scryfallQuery(d.next_page);
    }
  }

  await scryfallQuery(url);
  return collected_data;
}