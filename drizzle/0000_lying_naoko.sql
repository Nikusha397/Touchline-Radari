CREATE TABLE `entitlements` (
	`user_id` text NOT NULL,
	`trial_id` text NOT NULL,
	`order_id` text NOT NULL,
	`purchased_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `trial_id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`trial_id` text NOT NULL,
	`session_id` text,
	`session_url` text,
	`payment_intent` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_session` ON `orders` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_pending_user_trial` ON `orders` (`user_id`,`trial_id`) WHERE "orders"."status" = 'pending';--> statement-breakpoint
CREATE INDEX `orders_user` ON `orders` (`user_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`result_json` text
);
--> statement-breakpoint
CREATE TABLE `trials` (
	`id` text PRIMARY KEY NOT NULL,
	`public_json` text NOT NULL,
	`detail_json` text NOT NULL,
	`source_url` text NOT NULL,
	`checked_at` text NOT NULL,
	`state` text DEFAULT 'listed' NOT NULL,
	`evidence` text NOT NULL
);
