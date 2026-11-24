CREATE INDEX `course_project_created_at_idx` ON `course_project` (`created_at`);--> statement-breakpoint
CREATE INDEX `personal_workspace_user_id_idx` ON `personal_workspace` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_createdAt_idx` ON `user` (`createdAt`);--> statement-breakpoint
CREATE INDEX `user_role_banned_idx` ON `user` (`role`,`banned`);