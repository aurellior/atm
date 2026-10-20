CREATE OR REPLACE VIEW total_task_by_lead_id AS
WITH RECURSIVE Subordinates AS (
          SELECT id
          FROM employees
          UNION
          SELECT e.id
          FROM employees e
          INNER JOIN Subordinates s ON s.id = e.lead_id
          )
SELECT
    e.id AS employee_id,
    e.lead_id as employee_lead_id,
    COUNT(DISTINCT t.id) AS total_task
FROM
    employees e
LEFT JOIN
    tasks t ON e.id = t.employee_id
GROUP BY
    e.id;