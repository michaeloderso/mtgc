import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cards } from '$lib/server/db/schema';
import { isNotNull } from 'drizzle-orm';

export async function GET() {
	try {
		// Get all cards that have been rated
		const ratedCards = await db
			.select({
				oracleId: cards.oracleId,
				interestRating: cards.interestRating
			})
			.from(cards)
			.where(isNotNull(cards.interestRating));

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