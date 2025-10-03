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
			oracle_id: card.oracle_id,
			name: card.name,
			oracle_text: card.oracle_text,
			image_uri_png: card.image_uri_png,
			prices: card.price_usd ? {
				usd: card.price_usd
			} : undefined,
			set_name: card.set_name,
			rarity: card.rarity,
			colors: card.colors ? JSON.parse(card.colors) : undefined,
			color_identity: card.color_identity ? JSON.parse(card.color_identity) : undefined,
			power: card.power,
			toughness: card.toughness,
			artist: card.artist,
			card_faces: card.card_faces ? JSON.parse(card.card_faces) : undefined,
			interest_rating: card.interest_rating
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