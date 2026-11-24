-- void:allow-destructive
CREATE TABLE `project_attachment` (
	`project_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	PRIMARY KEY(`project_id`, `attachment_id`),
	FOREIGN KEY (`project_id`) REFERENCES `course_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_attachment_order_idx` ON `project_attachment` (`project_id`,`name`,`attachment_id`,`size`);--> statement-breakpoint
INSERT INTO `project_attachment` (`project_id`, `attachment_id`, `name`, `size`)
SELECT `project_id`, `attachment_id`, `name`, `size`
FROM `project_attachment_part`
WHERE `part` = 0;--> statement-breakpoint
CREATE TABLE `__new_project_attachment_part` (
	`project_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	`part` integer NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`project_id`, `attachment_id`, `part`),
	FOREIGN KEY (`project_id`,`attachment_id`) REFERENCES `project_attachment`(`project_id`,`attachment_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_project_attachment_part` (`project_id`, `attachment_id`, `part`, `content`)
SELECT `project_id`, `attachment_id`, `part`, `content`
FROM `project_attachment_part`;--> statement-breakpoint
DROP TABLE `project_attachment_part`;--> statement-breakpoint
ALTER TABLE `__new_project_attachment_part` RENAME TO `project_attachment_part`;