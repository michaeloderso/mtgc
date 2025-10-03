import { db } from './db';
import { cards } from './db/schema';
import { eq, sql, isNull, and } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';

interface ScryfallCard {
	id: string;
	oracle_id: string;
	name: string;
	cmc: number;
	oracle_text?: string;
	colors?: string[];
	color_identity?: string[];
	keywords?: string[];
	set_name: string;
	set: string;
	rarity: string;
	image_uris?: {
		png: string;
	};
	prices?: {
		usd?: string;
	};
	legalities: Record<string, string>;
	power?: string;
	toughness?: string;
	artist?: string;
	released_at: string;
	card_faces?: Array<{
		name?: string;
		oracle_text?: string;
		colors?: string[];
		power?: string;
		toughness?: string;
		image_uris?: {
			png: string;
		};
	}>;
}

interface ScryfallResponse {
	object: string;
	total_cards: number;
	has_more: boolean;
	next_page?: string;
	data: ScryfallCard[];
}

export class CardSyncService {
	private static readonly SCRYFALL_API_BASE = 'https://api.scryfall.com';
	private static readonly BATCH_SIZE = 175; // Scryfall's default page size
	private static readonly REQUEST_DELAY = 100; // 100ms delay between requests (Scryfall rate limit is 10/sec)

	static async initializeDatabase(): Promise<{ success: boolean; message: string }> {
		try {
			// Check if the cards table exists by trying to query it
			await db.select().from(cards).limit(1);
			return {
				success: true,
				message: 'Database already initialized'
			};
		} catch (error) {
			console.log('Database not initialized, running migrations...');
			try {
				// Create a new database connection for migrations
				const sqlite = new Database(env.DATABASE_URL);
				const migrationDb = drizzle(sqlite, { schema: { cards } });
				
				console.log('Running Drizzle migrations from ./drizzle folder...');
				// Run migrations using Drizzle's migration system
				await migrate(migrationDb, { migrationsFolder: './drizzle' });
				console.log('Migrations completed successfully');
				
				sqlite.close();
				
				// Test the table by running a simple query
				const testResult = await db.select().from(cards).limit(1);
				
				return {
					success: true,
					message: 'Database initialized successfully using Drizzle migrations'
				};
			} catch (initError) {
				console.error('Failed to initialize database:', initError);
				return {
					success: false,
					message: `Failed to initialize database: ${initError instanceof Error ? initError.message : String(initError)}`
				};
			}
		}
	}

	static async syncCommanderCards(progressCallback?: (progress: { processed: number; total: number; currentCard?: string }) => void): Promise<{ success: boolean; message: string; stats: { added: number; updated: number; total: number } }> {
		try {
			console.log('Starting commander card sync...');
			
			const stats = { added: 0, updated: 0, total: 0 };
			let url = `${this.SCRYFALL_API_BASE}/cards/search?q=is:commander game:paper legal:commander&order=name&unique=cards`;
			let processed = 0;
			let totalCards = 0;

			while (url) {
				console.log(`Fetching: ${url}`);
				
				const response = await fetch(url);
				
				if (!response.ok) {
					throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
				}

				const data: ScryfallResponse = await response.json();
				
				if (totalCards === 0) {
					totalCards = data.total_cards;
					console.log(`Found ${totalCards} commander cards to sync`);
				}

				// Process batch of cards
				for (const scryfallCard of data.data) {
					try {
						const cardData = this.transformScryfallCard(scryfallCard);
						
						// Check if card already exists
						const existingCard = await db.select().from(cards).where(eq(cards.id, cardData.id)).limit(1);
						
						if (existingCard.length > 0) {
							// Update existing card
							await db.update(cards)
								.set({ ...cardData, updated_at: new Date().toISOString() })
								.where(eq(cards.id, cardData.id));
							stats.updated++;
						} else {
							// Insert new card
							await db.insert(cards).values(cardData);
							stats.added++;
						}
						
						processed++;
						stats.total++;
						
						// Call progress callback if provided
						if (progressCallback) {
							progressCallback({
								processed,
								total: totalCards,
								currentCard: scryfallCard.name
							});
						}
						
					} catch (error) {
						console.error(`Error processing card ${scryfallCard.name}:`, error);
					}
				}

				// Set next URL or break
				url = data.has_more ? data.next_page! : '';
				
				// Respect rate limits
				if (url) {
					await this.delay(this.REQUEST_DELAY);
				}
			}

			const message = `Sync completed! Added ${stats.added} new cards, updated ${stats.updated} existing cards. Total: ${stats.total} cards processed.`;
			console.log(message);
			
			return {
				success: true,
				message,
				stats
			};

		} catch (error) {
			const errorMessage = `Failed to sync commander cards: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMessage);
			
			return {
				success: false,
				message: errorMessage,
				stats: { added: 0, updated: 0, total: 0 }
			};
		}
	}

	private static transformScryfallCard(scryfallCard: ScryfallCard) {
		return {
			id: scryfallCard.id,
			oracle_id: scryfallCard.oracle_id,
			name: scryfallCard.name,
			cmc: scryfallCard.cmc,
			oracle_text: scryfallCard.oracle_text || null,
			colors: scryfallCard.colors ? JSON.stringify(scryfallCard.colors) : null,
			color_identity: scryfallCard.color_identity ? JSON.stringify(scryfallCard.color_identity) : null,
			keywords: scryfallCard.keywords ? JSON.stringify(scryfallCard.keywords) : null,
			set_name: scryfallCard.set_name,
			set_code: scryfallCard.set,
			rarity: scryfallCard.rarity,
			image_uri_png: scryfallCard.image_uris?.png || null,
			price_usd: scryfallCard.prices?.usd || null,
			legalities: JSON.stringify(scryfallCard.legalities),
			power: scryfallCard.power || null,
			toughness: scryfallCard.toughness || null,
			artist: scryfallCard.artist || null,
			released_at: scryfallCard.released_at,
			is_commander: true,
			card_faces: scryfallCard.card_faces ? JSON.stringify(
				scryfallCard.card_faces.map(face => ({
					name: face.name,
					oracle_text: face.oracle_text,
					colors: face.colors,
					power: face.power,
					toughness: face.toughness,
					image_uri_png: face.image_uris?.png || null
				}))
			) : null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};
	}

	private static delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	static async getCommanderCardCount(): Promise<number> {
		try {
			const result = await db.select().from(cards).where(eq(cards.is_commander, true));
			return result.length;
		} catch (error) {
			console.log('Cards table not found, returning 0');
			return 0;
		}
	}

	static async getRandomCommanderCard() {
		try {
			const result = await db.select().from(cards)
				.where(eq(cards.is_commander, true))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			
			return result[0] || null;
		} catch (error) {
			console.log('Cards table not found, returning null');
			return null;
		}
	}

	static async rateCard(cardId: string, rating: 'interesting' | 'not_interesting' | null): Promise<{ success: boolean; message: string }> {
		try {
			const result = await db.update(cards)
				.set({ 
					interest_rating: rating,
					updated_at: new Date().toISOString()
				})
				.where(eq(cards.id, cardId));
			
			return {
				success: true,
				message: `Card marked as ${rating || 'unrated'}`
			};
		} catch (error) {
			console.error('Error rating card:', error);
			return {
				success: false,
				message: 'Failed to rate card'
			};
		}
	}

	static async getRandomCommanderCardByRating(rating?: 'interesting' | 'not_interesting' | 'unrated') {
		if (rating === 'interesting') {
			const result = await db.select().from(cards)
				.where(and(
					eq(cards.is_commander, true),
					eq(cards.interest_rating, 'interesting')
				))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			return result[0] || null;
		} else if (rating === 'not_interesting') {
			const result = await db.select().from(cards)
				.where(and(
					eq(cards.is_commander, true),
					eq(cards.interest_rating, 'not_interesting')
				))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			return result[0] || null;
		} else if (rating === 'unrated') {
			const result = await db.select().from(cards)
				.where(and(
					eq(cards.is_commander, true),
					isNull(cards.interest_rating)
				))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			return result[0] || null;
		} else {
			// Return any random commander card
			const result = await db.select().from(cards)
				.where(eq(cards.is_commander, true))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			return result[0] || null;
		}
	}

	static async getCardStats(): Promise<{ total: number; interesting: number; not_interesting: number; unrated: number }> {
		try {
			const allCards = await db.select().from(cards).where(eq(cards.is_commander, true));
			
			const stats = {
				total: allCards.length,
				interesting: allCards.filter(card => card.interest_rating === 'interesting').length,
				not_interesting: allCards.filter(card => card.interest_rating === 'not_interesting').length,
				unrated: allCards.filter(card => card.interest_rating === null).length
			};
			
			return stats;
		} catch (error) {
			console.log('Cards table not found, returning empty stats');
			return { total: 0, interesting: 0, not_interesting: 0, unrated: 0 };
		}
	}

	static async getCardsByRating(rating: 'interesting' | 'not_interesting'): Promise<any[]> {
		try {
			const result = await db.select().from(cards)
				.where(and(
					eq(cards.is_commander, true),
					eq(cards.interest_rating, rating)
				))
				.orderBy(sql`name ASC`);
			
			// Transform the database cards to match the frontend interface
			return result.map(card => ({
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
			}));
		} catch (error) {
			console.log('Error fetching cards by rating:', error);
			return [];
		}
	}
}