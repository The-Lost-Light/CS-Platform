CREATE TABLE `course_project` (
	`id` text PRIMARY KEY NOT NULL,
	`code_name` text NOT NULL,
	`data` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_project_code_name_unique` ON `course_project` (`code_name`);