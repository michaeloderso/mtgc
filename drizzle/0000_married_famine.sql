CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`oracle_id` text NOT NULL,
	`name` text NOT NULL,
	`cmc` real DEFAULT 0 NOT NULL,
	`oracle_text` text,
	`colors` text,
	`color_identity` text,
	`keywords` text,
	`set_name` text NOT NULL,
	`set_code` text NOT NULL,
	`rarity` text NOT NULL,
	`image_uri_normal` text,
	`image_uri_large` text,
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
CREATE TABLE `user` (
	`id` integer PRIMARY KEY NOT NULL,
	`age` integer
);
