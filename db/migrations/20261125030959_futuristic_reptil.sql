CREATE TABLE `project_attachment_part` (
	`project_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	`part` integer NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`project_id`, `attachment_id`, `part`),
	FOREIGN KEY (`project_id`,`attachment_id`) REFERENCES `project_attachment`(`project_id`,`attachment_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_attachment` (
	`project_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`project_id`, `attachment_id`),
	FOREIGN KEY (`project_id`) REFERENCES `course_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_attachment_order_idx` ON `project_attachment` (`deleted`,`project_id`,`name`,`attachment_id`,`size`);--> statement-breakpoint
CREATE TABLE `course_project` (
	`id` text PRIMARY KEY NOT NULL,
	`project_index` integer NOT NULL,
	`data` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_project_active_index_unique` ON `course_project` (`project_index`) WHERE "course_project"."deleted" = 0 AND "course_project"."project_index" > 0;--> statement-breakpoint
CREATE INDEX `course_project_deleted_index_idx` ON `course_project` (`deleted`,`project_index`,`id`);--> statement-breakpoint
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
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `personal_workspace_user_id_idx` ON `personal_workspace` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `personal_workspace_project_id_user_id_unique` ON `personal_workspace` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	`impersonatedBy` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`role` text,
	`banned` integer,
	`banReason` text,
	`banExpires` integer,
	`deleted` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_deleted_createdAt_idx` ON `user` (`deleted`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_role_banned_deleted_idx` ON `user` (`deleted`,`role`,`banned`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);