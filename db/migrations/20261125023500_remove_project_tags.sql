UPDATE `course_project`
SET `data` = json_remove(`data`, '$.tags')
WHERE json_type(`data`, '$.tags') IS NOT NULL;
