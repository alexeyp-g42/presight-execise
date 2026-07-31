-- The `WITHOUT ROWID` below is the one hand edit in this file: Drizzle cannot
-- express the clause, and a pure junction table with a composite primary key is
-- the textbook case for it — the PK becomes the table, so there is no second
-- copy of every row hanging off an implicit rowid. Regenerating this migration
-- would drop the clause, so `test/db/schema.test.ts` asserts the applied table
-- really is WITHOUT ROWID and fails the suite if it comes back.
CREATE TABLE `user_hobbies` (
	`user_id` integer NOT NULL,
	`hobby` text NOT NULL,
	PRIMARY KEY(`user_id`, `hobby`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
) WITHOUT ROWID;
--> statement-breakpoint
CREATE INDEX `idx_user_hobbies_hobby` ON `user_hobbies` (`hobby`,`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`age` integer NOT NULL,
	`nationality` text NOT NULL,
	`search_name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_users_first_name` ON `users` (`first_name`,`id`);--> statement-breakpoint
CREATE INDEX `idx_users_last_name` ON `users` (`last_name`,`id`);--> statement-breakpoint
CREATE INDEX `idx_users_age` ON `users` (`age`,`id`);--> statement-breakpoint
CREATE INDEX `idx_users_nationality` ON `users` (`nationality`,`id`);