import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { cards } from '$lib/server/db/schema';

export const POST: RequestHandler = async () => {
	try {
		// Delete all cards from the database
		const result = await db.delete(cards);
		
		return json({
			success: true,
			message: 'Database cleared successfully. All cards have been removed.'
		});
	} catch (error) {
		console.error('Clear database error:', error);
		return json({
			success: false,
			message: 'Failed to clear database'
		}, { status: 500 });
	}
};