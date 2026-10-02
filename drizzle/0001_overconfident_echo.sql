CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`brand` text NOT NULL,
	`industry` text NOT NULL,
	`service` text NOT NULL,
	`budget` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `applications` ADD `experience` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `work_type` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `availability` text DEFAULT '' NOT NULL;