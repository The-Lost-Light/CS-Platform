UPDATE course_project
SET data = json_remove(data, '$.summary')
WHERE json_type(data, '$.summary') IS NOT NULL;
