import { json } from '@sveltejs/kit';
import { CardSyncService } from '$lib/server/card-sync';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const rating = url.searchParams.get('rating') as 'interesting' | 'not_interesting' | 'unrated' | null;
		
		const card = await CardSyncService.getRandomCommanderCardByRating(rating || undefined);
		
		if (!card) {
			const message = rating 
				? `No commander cards found with rating: ${rating}` 
				: 'No commander cards found in database. Please sync cards first.';
			return json({ 
				success: false, 
				message 
			}, { status: 404 });
		}
		
		// Transform the database card to match the frontend interface
		const transformedCard = {
			id: card.id,
			oracleId: card.oracleId,
			name: card.name,
			oracleText: card.oracleText,
			imageUriPng: card.imageUriPng,
			prices: card.priceUsd ? {
				usd: card.priceUsd
			} : undefined,
			setName: card.setName,
			rarity: card.rarity,
			power: card.power,
			toughness: card.toughness,
			artist: card.artist,
            cardFaces: card.cardFaces,
			interestRating: card.interestRating
		};
		
		return json({ success: true, card: transformedCard });
		
	} catch (error) {
		console.error('API error:', error);
		return json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
};