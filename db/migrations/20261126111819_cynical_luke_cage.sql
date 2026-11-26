CREATE TABLE `design_version_part` (
	`id` text NOT NULL,
	`part` integer NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`id`, `part`),
	FOREIGN KEY (`id`) REFERENCES `design_version`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `design_version` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`version` integer NOT NULL,
	`edited_at` integer NOT NULL,
	`checkpoint` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `course_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `design_version_project_id_user_id_version_unique` ON `design_version` (`project_id`,`user_id`,`version`);
--> statement-breakpoint
INSERT INTO design_version (id, project_id, user_id, version, edited_at, checkpoint)
SELECT w.revision, w.project_id, w.user_id, 1, w.updated_at, 1
FROM personal_workspace w JOIN course_project p ON p.id = w.project_id;
--> statement-breakpoint
INSERT INTO design_version_part (id, part, content)
SELECT p.revision, p.part, p.content
FROM personal_workspace_part p JOIN design_version v ON v.id = p.revision;
