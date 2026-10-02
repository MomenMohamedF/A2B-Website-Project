CREATE TABLE `recovery_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text DEFAULT 'normal' NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`phone_verified` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`last_login_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
ALTER TABLE `applications` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `inquiries` ADD `user_id` text REFERENCES users(id);