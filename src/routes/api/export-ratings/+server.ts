import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cards } from '$lib/server/db/schema';
import { isNotNull } from 'drizzle-orm';

export async function GET() {
	try {
		// Get all cards that have been rated
		const ratedCards = await db
			.select({
				oracle_id: cards.oracle_id,
				interest_rating: cards.interest_rating
			})
			.from(cards)
			.where(isNotNull(cards.interest_rating));

		return json({
			success: true,
			ratings: ratedCards,
			count: ratedCards.length
		});
	} catch (error) {
		console.error('Export error:', error);
		return json({
			success: false,
			message: 'Failed to export ratings'
		}, { status: 500 });
	}
}