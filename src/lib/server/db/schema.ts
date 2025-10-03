import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: integer('id').primaryKey(),
	age: integer('age')
});

export const cards = sqliteTable('cards', {
	id: text('id').primaryKey(),
	oracle_id: text('oracle_id').notNull(),
	name: text('name').notNull(),
	cmc: real('cmc').notNull().default(0),
	oracle_text: text('oracle_text'),
	colors: text('colors'), // JSON string array
	color_identity: text('color_identity'), // JSON string array
	keywords: text('keywords'), // JSON string array
	set_name: text('set_name').notNull(),
	set_code: text('set_code').notNull(),
	rarity: text('rarity').notNull(),
	image_uri_png: text('image_uri_png'),
	price_usd: text('price_usd'),
	legalities: text('legalities'), // JSON object
	power: text('power'),
	toughness: text('toughness'),
	artist: text('artist'),
	released_at: text('released_at'),
	is_commander: integer('is_commander', { mode: 'boolean' }).notNull().default(true),
	card_faces: text('card_faces'), // JSON array for double-faced cards
	interest_rating: text('interest_rating'), // 'interesting', 'not_interesting', or null
	created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
	updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP')
});
