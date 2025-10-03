import { json } from '@sveltejs/kit';
import { CardSyncService } from '$lib/server/card-sync';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, cardId, rating } = await request.json();
		
		if (action === 'init') {
			// Initialize database
			const result = await CardSyncService.initializeDatabase();
			return json(result);
		}
		
		if (action === 'sync') {
			// Ensure database is initialized before syncing
			const initResult = await CardSyncService.initializeDatabase();
			if (!initResult.success) {
				return json(initResult);
			}
			
			// Start the sync process
			const result = await CardSyncService.syncCommanderCards();
			return json(result);
		}
		
		if (action === 'rate') {
			if (!cardId) {
				return json({ success: false, message: 'Card ID is required' }, { status: 400 });
			}
			
			// Validate rating value
			if (rating !== null && rating !== 'interesting' && rating !== 'not_interesting') {
				return json({ success: false, message: 'Invalid rating value' }, { status: 400 });
			}
			
			const result = await CardSyncService.rateCard(cardId, rating);
			return json(result);
		}
		
		if (action === 'count') {
			// Get current count of commander cards
			const count = await CardSyncService.getCommanderCardCount();
			return json({ success: true, count });
		}
		
		if (action === 'stats') {
			// Get card statistics
			const stats = await CardSyncService.getCardStats();
			return json({ success: true, stats });
		}
		
		return json({ success: false, message: 'Invalid action' }, { status: 400 });
		
	} catch (error) {
		console.error('API error:', error);
		return json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async () => {
	try {
		const count = await CardSyncService.getCommanderCardCount();
		const stats = await CardSyncService.getCardStats();
		return json({ success: true, count, stats });
	} catch (error) {
		console.error('API error:', error);
		return json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
};