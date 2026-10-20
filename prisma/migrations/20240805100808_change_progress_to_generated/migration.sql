ALTER TABLE activities
DROP COLUMN progress;

ALTER TABLE activities
ADD COLUMN progress INT GENERATED ALWAYS AS (
  CASE 
    WHEN complete_status = 'DONE' THEN 100 
    WHEN complete_status = 'IN_PROGRESS' THEN 0 
    ELSE NULL
  END
) STORED;