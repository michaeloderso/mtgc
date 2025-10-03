import { db } from "./db";
import { cards } from "./db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "$env/dynamic/private";
import type { Card, ScryfallResponse } from "$lib/types/scryfall";
import { multiPageQuery, prepareQuery } from "./encode";

export class CardSyncService {
	static async initializeDatabase(): Promise<
		{ success: boolean; message: string }
	> {
		try {
			// Check if the cards table exists by trying to query it
			await db.select().from(cards).limit(1);
			return {
				success: true,
				message: "Database already initialized",
			};
		} catch (error) {
			console.log("Database not initialized, running migrations...");
			try {
				// Create a new database connection for migrations
				const sqlite = new Database(env.DATABASE_URL);
				const migrationDb = drizzle(sqlite, { schema: { cards } });

				console.log(
					"Running Drizzle migrations from ./drizzle folder...",
				);
				// Run migrations using Drizzle's migration system
				await migrate(migrationDb, { migrationsFolder: "./drizzle" });
				console.log("Migrations completed successfully");

				sqlite.close();

				// Test the table by running a simple query
				const testResult = await db.select().from(cards).limit(1);

				return {
					success: true,
					message:
						"Database initialized successfully using Drizzle migrations",
				};
			} catch (initError) {
				console.error("Failed to initialize database:", initError);
				return {
					success: false,
					message: `Failed to initialize database: ${
						initError instanceof Error
							? initError.message
							: String(initError)
					}`,
				};
			}
		}
	}

	static async syncCommanderCards(
		progressCallback?: (
			progress: {
				processed: number;
				total: number;
				currentCard?: string;
			},
		) => void,
	): Promise<
		{
			success: boolean;
			message: string;
			stats: { added: number; updated: number; total: number };
		}
	> {
		let downloaded = 0;
		let processed = 0;
		let totalCards = 0;
		const stats = {
			added: 0,
			updated: 0,
			total: 0,
		};

		const url = prepareQuery("is:commander game:paper legal:commander");
		const collected_data = await multiPageQuery(url);

		// All data collected, now update database
		for (const card of collected_data) {
			try {
				// Check if card already exists
				const existingCard = await db.select().from(cards).where(
					eq(cards.id, card.id),
				).limit(1);

				if (existingCard.length > 0) {
					// Update existing card
					await db.update(cards)
						.set({ ...card, updatedAt: new Date().toISOString() })
						.where(eq(cards.id, card.id));
					stats.updated++;
				} else {
					// Insert new card
					await db.insert(cards).values({
						...card,
						rarity: card.rarity || "common",
					});
					stats.added++;
				}

				processed++;
				stats.total++;

				// Call progress callback if provided
				if (progressCallback) {
					progressCallback({
						processed,
						total: totalCards,
						currentCard: card.name,
					});
				}
			} catch (error) {
				console.error(`Error processing card ${card.name}:`, error);
			}
		}

		const message =
			`Sync completed! Added ${stats.added} new cards, updated ${stats.updated} existing cards. Total: ${stats.total} cards processed.`;
		console.log(message);

		return {
			success: true,
			message,
			stats,
		};
	}

	private static delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	static async getCommanderCardCount(): Promise<number> {
		try {
			const result = await db.select().from(cards).where(
				eq(cards.isCommander, true),
			);
			return result.length;
		} catch (error) {
			console.log("Cards table not found, returning 0");
			return 0;
		}
	}

	static async getRandomCommanderCard() {
		try {
			const result = await db.select().from(cards)
				.where(eq(cards.isCommander, true))
				.orderBy(sql`RANDOM()`)
				.limit(1);

			return result[0] || null;
		} catch (error) {
			console.log("Cards table not found, returning null");
			return null;
		}
	}

	static async rateCard(
		cardId: string,
		rating: "interesting" | "not_interesting" | null,
	): Promise<{ success: boolean; message: string }> {
		try {
			const result = await db.update(cards)
				.set({
					interestRating: rating,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(cards.id, cardId));

			return {
				success: true,
				message: `Card marked as ${rating || "unrated"}`,
			};
		} catch (error) {
			console.error("Error rating card:", error);
			return {
				success: false,
				message: "Failed to rate card",
			};
		}
	}

	static async getRandomCommanderCardByRating(
		rating?: "interesting" | "not_interesting" | "unrated",
	) {
		if (rating === "interesting") {
			const result = await db.select().from(cards)
				.where(and(
					eq(cards.isCommander, true),
					eq(cards.interestRating, "interesting"),
				))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			return result[0] || null;
		} else if (rating === "not_interesting") {
			const result = await db.select().from(cards)
				.where(and(
					eq(cards.isCommander, true),
					eq(cards.interestRating, "not_interesting"),
				))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			return result[0] || null;
		} else if (rating === "unrated") {
			const result = await db.select().from(cards)
				.where(and(
					eq(cards.isCommander, true),
					isNull(cards.interestRating),
				))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			return result[0] || null;
		} else {
			// Return any random commander card
			const result = await db.select().from(cards)
				.where(eq(cards.isCommander, true))
				.orderBy(sql`RANDOM()`)
				.limit(1);
			return result[0] || null;
		}
	}

	static async getCardStats(): Promise<
		{
			total: number;
			interesting: number;
			not_interesting: number;
			unrated: number;
		}
	> {
		try {
			const allCards = await db.select().from(cards).where(
				eq(cards.isCommander, true),
			);

			const stats = {
				total: allCards.length,
				interesting: allCards.filter((card) =>
					card.interestRating === "interesting"
				).length,
				not_interesting: allCards.filter((card) =>
					card.interestRating === "not_interesting"
				).length,
				unrated: allCards.filter((card) =>
					card.interestRating === null
				).length,
			};

			return stats;
		} catch (error) {
			console.log("Cards table not found, returning empty stats");
			return { total: 0, interesting: 0, not_interesting: 0, unrated: 0 };
		}
	}

	static async getCardsByRating(
		rating: "interesting" | "not_interesting",
	): Promise<any[]> {
		try {
			const result = await db.select().from(cards)
				.where(and(
					eq(cards.isCommander, true),
					eq(cards.interestRating, rating),
				))
				.orderBy(sql`name ASC`);

			// Transform the database cards to match the frontend interface
			return result.map((card) => ({
				id: card.id,
				oracleId: card.oracleId,
				name: card.name,
				oracleText: card.oracleText,
				imageUriPng: card.imageUriPng,
				prices: card.priceUsd
					? {
						usd: card.priceUsd,
					}
					: undefined,
				setName: card.setName,
				rarity: card.rarity,
				power: card.power,
				toughness: card.toughness,
				artist: card.artist,
				cardFaces: card.cardFaces,
				interestRating: card.interestRating,
			}));
		} catch (error) {
			console.log("Error fetching cards by rating:", error);
			return [];
		}
	}
}
