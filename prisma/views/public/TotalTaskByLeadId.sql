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
    (
      employees e_1
      JOIN subordinates s ON ((s.id = e_1.lead_id))
    )
)
SELECT
  e.id AS employee_id,
  e.name AS employee_name,
  e.lead_id AS employee_lead_id,
  count(DISTINCT t.id) AS total_task
FROM
  (
    employees e
    LEFT JOIN tasks t ON ((e.id = t.employee_id))
  )
GROUP BY
  e.id,
  e.name,
  e.lead_id;