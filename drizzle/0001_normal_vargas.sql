ALTER TABLE `cards` ADD `image_uri_png` text;--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `image_uri_normal`;--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `image_uri_large`;