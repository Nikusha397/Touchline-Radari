CREATE TABLE `agreements` (
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`version` text NOT NULL,
	`agreed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `kind`, `version`)
);
--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`processed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`order_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `provider` text DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `amount` integer DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `currency` text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `consent_version` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `consent_at` text;