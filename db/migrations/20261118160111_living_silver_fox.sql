CREATE TABLE `personal_workspace_part` (
	`revision` text NOT NULL,
	`part` integer NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`revision`, `part`),
	FOREIGN KEY (`revision`) REFERENCES `personal_workspace`(`revision`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `personal_workspace` (
	`revision` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personal_workspace_project_id_user_id_unique` ON `personal_workspace` (`project_id`,`user_id`);