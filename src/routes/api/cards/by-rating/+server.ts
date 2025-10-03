import { json } from '@sveltejs/kit';
import { CardSyncService } from '$lib/server/card-sync';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const rating = url.searchParams.get('rating') as 'interesting' | 'not_interesting' | null;
		
		if (!rating || (rating !== 'interesting' && rating !== 'not_interesting')) {
			return json({ 
				success: false, 
				message: 'Invalid rating parameter. Must be "interesting" or "not_interesting".' 
			}, { status: 400 });
		}

		const cards = await CardSyncService.getCardsByRating(rating);
		
		return json({ success: true, cards });
		
	} catch (error) {
		console.error('API error:', error);
		return json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
};