CREATE OR REPLACE VIEW employee_summary AS
SELECT
    e.id AS employee_id,
    COUNT(DISTINCT pj.project_id) AS total_project,
    COUNT(DISTINCT t.id) AS total_task,
    COUNT(DISTINCT tf.id) AS total_task_finished
FROM
    employees e
LEFT JOIN
    projects_joined pj ON e.id = pj.employee_id
LEFT JOIN
    tasks t ON e.id = t.employee_id
LEFT JOIN
    tasks tf ON e.id = tf.employee_id AND tf.progress = 100
GROUP BY
    e.id;
