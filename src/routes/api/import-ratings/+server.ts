import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { cards } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { ratings } = await request.json();
		
		if (!Array.isArray(ratings)) {
			return json({
				success: false,
				message: 'Invalid ratings format. Expected an array.'
			}, { status: 400 });
		}

		let imported = 0;
		let updated = 0;
		let errors = 0;

		for (const rating of ratings) {
			if (!rating.oracle_id || !rating.interest_rating) {
				errors++;
				continue;
			}

			try {
				// Check if card exists in database
				const existingCard = await db
					.select({ id: cards.id })
					.from(cards)
					.where(eq(cards.oracle_id, rating.oracle_id))
					.limit(1);

				if (existingCard.length > 0) {
					// Update existing card
					await db
						.update(cards)
						.set({ interest_rating: rating.interest_rating })
						.where(eq(cards.oracle_id, rating.oracle_id));
					updated++;
				} else {
					// Card doesn't exist in database, skip it
					// We only import ratings for cards that are already in the database
					errors++;
				}
			} catch (err) {
				console.error(`Error processing rating for oracle_id ${rating.oracle_id}:`, err);
				errors++;
			}
		}

		imported = updated; // All successful operations are updates in this case

		let message = `Import completed. Updated: ${updated}`;
		if (errors > 0) {
			message += `, Errors/Skipped: ${errors}`;
		}

		return json({
			success: true,
			message,
			imported,
			updated,
			errors
		});
	} catch (error) {
		console.error('Import error:', error);
		return json({
			success: false,
			message: 'Failed to import ratings'
		}, { status: 500 });
	}
};