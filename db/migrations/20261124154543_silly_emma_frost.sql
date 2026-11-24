-- void:allow-destructive
DROP INDEX `course_project_project_index_unique`;--> statement-breakpoint
UPDATE `course_project` SET `project_index` = 0 WHERE `deleted` = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `course_project_active_index_unique` ON `course_project` (`project_index`) WHERE "course_project"."deleted" = 0 AND "course_project"."project_index" > 0;
