import { primaryKey } from 'drizzle-orm/gel-core';
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const cards = sqliteTable("cards", {
	// Custom fields
	internalId: integer("internal_id").primaryKey({ autoIncrement: true }),
	// Scryfall fields (not fully listed)
	id: text(),
	oracleId: text("oracle_id"),
	name: text().notNull(),
	cmc: real().notNull().default(0),
	oracleText: text("oracle_text"),
	setName: text("set_name"),
	setCode: text("set_code"),
	rarity: text().notNull(),
	imageUriPng: text("image_uri_png"),
	priceUsd: text("price_usd"),
	legalities: text({ mode: 'json' }),
	power: text(),
	toughness: text(),
	artist: text(),
	releasedAt: text("released_at"),
	isCommander: integer("is_commander", { mode: "boolean" }).notNull().default(true),
	cardFaces: text({ mode: 'json' }),
	interestRating: text("interest_rating"), // 'interesting', 'not_interesting', or null
	createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
	updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
});
