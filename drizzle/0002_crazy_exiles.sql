CREATE TABLE `agent_files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `agent_files_owner` ON `agent_files` (`user_id`);--> statement-breakpoint
CREATE TABLE `agent_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`delta` integer NOT NULL,
	`purpose` text DEFAULT 'unlock' NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `agent_ledger_owner_purpose` ON `agent_ledger` (`user_id`,`purpose`);--> statement-breakpoint
CREATE TABLE `agent_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bundle` integer NOT NULL,
	`purpose` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`session_id` text,
	`capture_id` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_paypal_order` ON `agent_orders` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_paypal_capture` ON `agent_orders` (`capture_id`);--> statement-breakpoint
CREATE INDEX `agent_orders_owner` ON `agent_orders` (`user_id`);--> statement-breakpoint
CREATE TABLE `agent_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`destination_key` text NOT NULL,
	`recipient_id` text NOT NULL,
	`recipient_name` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`provider_id` text,
	`charge_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_one_submission_per_agency` ON `agent_submissions` (`user_id`,`destination_key`);--> statement-breakpoint
CREATE TABLE `agent_unlocks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_unlock_owner_destination` ON `agent_unlocks` (`user_id`,`recipient_id`);