CREATE TABLE `project_attachment_part` (
	`project_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	`part` integer NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`project_id`, `attachment_id`, `part`),
	FOREIGN KEY (`project_id`) REFERENCES `course_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Preserve the teacher's existing text as one Markdown assignment. Personal workspaces have their own table.
UPDATE course_project
SET data = json_remove(
  json_set(data, '$.content', trim(
    coalesce((SELECT group_concat('- ' || value, char(10)) FROM json_each(course_project.data, '$.requirements')), '')
    || char(10) || char(10) || coalesce(json_extract(data, '$.initialDesignDoc'), ''), char(10)
  )),
  '$.requirements', '$.initialDesignDoc', '$.initialMindMapNodes', '$.defaultRepoUrl',
  '$.type', '$.difficulty', '$.difficultyColor', '$.status'
)
WHERE json_type(data, '$.content') IS NULL;
