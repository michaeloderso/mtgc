PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cards` (
	`internal_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text,
	`oracle_id` text,
	`name` text NOT NULL,
	`cmc` real DEFAULT 0 NOT NULL,
	`oracle_text` text,
	`colors` text,
	`color_identity` text,
	`keywords` text,
	`set_name` text NOT NULL,
	`set_code` text NOT NULL,
	`rarity` text NOT NULL,
	`image_uri_png` text,
	`price_usd` text,
	`legalities` text,
	`power` text,
	`toughness` text,
	`artist` text,
	`released_at` text,
	`is_commander` integer DEFAULT true NOT NULL,
	`card_faces` text,
	`interest_rating` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_cards`("internal_id", "id", "oracle_id", "name", "cmc", "oracle_text", "colors", "color_identity", "keywords", "set_name", "set_code", "rarity", "image_uri_png", "price_usd", "legalities", "power", "toughness", "artist", "released_at", "is_commander", "card_faces", "interest_rating", "created_at", "updated_at") SELECT "internal_id", "id", "oracle_id", "name", "cmc", "oracle_text", "colors", "color_identity", "keywords", "set_name", "set_code", "rarity", "image_uri_png", "price_usd", "legalities", "power", "toughness", "artist", "released_at", "is_commander", "card_faces", "interest_rating", "created_at", "updated_at" FROM `cards`;--> statement-breakpoint
DROP TABLE `cards`;--> statement-breakpoint
ALTER TABLE `__new_cards` RENAME TO `cards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;