ALTER TABLE `cards` RENAME COLUMN "card_faces" TO "cardFaces";--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `colors`;--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `colorIdentity`;--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `keywords`;