import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { cards } from '$lib/server/db/schema';

export const POST: RequestHandler = async () => {
	try {
		// Clear all interest ratings but keep the cards
		const result = await db
			.update(cards)
			.set({ interest_rating: null });
		
		return json({
			success: true,
			message: 'Progress cleared successfully. All card ratings have been removed.'
		});
	} catch (error) {
		console.error('Clear progress error:', error);
		return json({
			success: false,
			message: 'Failed to clear progress'
		}, { status: 500 });
	}
};