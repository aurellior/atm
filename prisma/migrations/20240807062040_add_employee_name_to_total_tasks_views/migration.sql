DROP VIEW IF EXISTS total_task_by_lead_id;

CREATE OR REPLACE VIEW total_task_by_lead_id AS
WITH RECURSIVE subordinates AS (
  SELECT
    employees.id,
    employees.name
  FROM
    employees
  UNION
  SELECT
    e_1.id,
    e_1.name
  FROM
    employees e_1
    JOIN subordinates s ON s.id = e_1.lead_id
)
SELECT
  e.id AS employee_id,
  e.name AS employee_name,
  e.lead_id AS employee_lead_id,
  COUNT(DISTINCT t.id) AS total_task
FROM
  employees e
  LEFT JOIN tasks t ON e.id = t.employee_id
GROUP BY
  e.id, e.name, e.lead_id;