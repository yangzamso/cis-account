CREATE TABLE `account_items` (
	`code` text PRIMARY KEY NOT NULL,
	`name_ko` text NOT NULL,
	`name_ru` text NOT NULL,
	`type` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `churches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_ko` text NOT NULL,
	`name_ru` text NOT NULL,
	`currency_code` text DEFAULT 'USD' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deposits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`church_id` integer NOT NULL,
	`category` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`carried_over` real DEFAULT 0 NOT NULL,
	`increase` real DEFAULT 0 NOT NULL,
	`decrease` real DEFAULT 0 NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`church_id`) REFERENCES `churches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`church_id` integer NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`rate_to_usd` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`church_id`) REFERENCES `churches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expense_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`church_id` integer NOT NULL,
	`date` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`account_code` text NOT NULL,
	`account_name_ko` text NOT NULL,
	`account_name_ru` text NOT NULL,
	`amount_usd` real DEFAULT 0 NOT NULL,
	`amount_local` real DEFAULT 0 NOT NULL,
	`description_ko` text DEFAULT '' NOT NULL,
	`description_ru` text DEFAULT '' NOT NULL,
	`receipt_attached` integer DEFAULT false NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`church_id`) REFERENCES `churches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `income_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`church_id` integer NOT NULL,
	`date` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`tithes` real DEFAULT 0 NOT NULL,
	`sunday_offerings` real DEFAULT 0 NOT NULL,
	`thanksgiving` real DEFAULT 0 NOT NULL,
	`center_support` real DEFAULT 0 NOT NULL,
	`other_offerings` real DEFAULT 0 NOT NULL,
	`building_fund` real DEFAULT 0 NOT NULL,
	`hq_building_fund` real DEFAULT 0 NOT NULL,
	`other_income` real DEFAULT 0 NOT NULL,
	`currency_type` text DEFAULT 'usd' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`church_id`) REFERENCES `churches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`church_id` integer NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`carried_over` real DEFAULT 0 NOT NULL,
	`monthly_borrowing` real DEFAULT 0 NOT NULL,
	`monthly_repayment` real DEFAULT 0 NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`borrower_type` text DEFAULT 'member' NOT NULL,
	`borrower_name` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`church_id`) REFERENCES `churches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tithe_reserves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`church_id` integer NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`total_offerings` real DEFAULT 0 NOT NULL,
	`one_tenth` real DEFAULT 0 NOT NULL,
	`prev_balance` real DEFAULT 0 NOT NULL,
	`remittance_to_hq` real DEFAULT 0 NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`church_id`) REFERENCES `churches`(`id`) ON UPDATE no action ON DELETE no action
);
