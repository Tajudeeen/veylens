CREATE TABLE `collection_budgets` (
	`key` text PRIMARY KEY NOT NULL,
	`used` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collection_budgets_expiry` ON `collection_budgets` (`expires_at`);