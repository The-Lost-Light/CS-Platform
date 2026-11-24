-- void:allow-destructive
DROP INDEX `course_project_code_name_unique`;--> statement-breakpoint
DROP INDEX `course_project_created_at_idx`;--> statement-breakpoint
ALTER TABLE `course_project` DROP COLUMN `code_name`;--> statement-breakpoint
ALTER TABLE `course_project` ADD `project_index` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `course_project` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `course_project` SET `deleted` = 1 WHERE `id` IN (SELECT `id` FROM `removed_project`);--> statement-breakpoint
INSERT INTO `course_project` (`id`, `project_index`, `data`, `created_by`, `created_at`, `deleted`)
SELECT
  `id`,
  CASE WHEN `id` = 'project-fullstack-web' THEN 1 ELSE 2 END,
  json_object('id', `id`, 'title', '', 'dueDate', '', 'points', 0, 'tags', json('[]'), 'content', ''),
  'system',
  0,
  1
FROM `removed_project`
WHERE `id` IN ('project-fullstack-web', 'project-ai-rag-agent')
  AND NOT EXISTS (SELECT 1 FROM `course_project` WHERE `course_project`.`id` = `removed_project`.`id`);--> statement-breakpoint
UPDATE `course_project` SET `project_index` = 1 WHERE `id` = 'project-fullstack-web';--> statement-breakpoint
UPDATE `course_project` SET `project_index` = 2 WHERE `id` = 'project-ai-rag-agent';--> statement-breakpoint
WITH `numbered` AS (
  SELECT `id`, 2 + ROW_NUMBER() OVER (ORDER BY `created_at` ASC, `id` ASC) AS `next_index`
  FROM `course_project`
  WHERE `id` NOT IN ('project-fullstack-web', 'project-ai-rag-agent')
)
UPDATE `course_project`
SET `project_index` = (SELECT `next_index` FROM `numbered` WHERE `numbered`.`id` = `course_project`.`id`)
WHERE `id` NOT IN ('project-fullstack-web', 'project-ai-rag-agent');--> statement-breakpoint
UPDATE `course_project`
SET `data` = json_remove(`data`, '$.codeName')
WHERE json_type(`data`, '$.codeName') IS NOT NULL;--> statement-breakpoint
DROP TABLE `removed_project`;--> statement-breakpoint
CREATE UNIQUE INDEX `course_project_project_index_unique` ON `course_project` (`project_index`);--> statement-breakpoint
CREATE INDEX `course_project_deleted_index_idx` ON `course_project` (`deleted`,`project_index`,`id`);--> statement-breakpoint
DROP INDEX `project_attachment_order_idx`;--> statement-breakpoint
ALTER TABLE `project_attachment` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `project_attachment_order_idx` ON `project_attachment` (`deleted`,`project_id`,`name`,`attachment_id`,`size`);--> statement-breakpoint
DROP INDEX `user_createdAt_idx`;--> statement-breakpoint
DROP INDEX `user_role_banned_idx`;--> statement-breakpoint
ALTER TABLE `user` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `user_deleted_createdAt_idx` ON `user` (`deleted`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_role_banned_deleted_idx` ON `user` (`deleted`,`role`,`banned`);
