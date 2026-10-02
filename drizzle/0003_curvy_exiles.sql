CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`subject_id` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `admin_role` text DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `job_title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_single_owner` ON `users` (`admin_role`) WHERE "users"."admin_role" = 'owner';