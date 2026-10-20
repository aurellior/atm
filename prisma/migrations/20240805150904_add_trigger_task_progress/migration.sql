CREATE OR REPLACE FUNCTION update_task_progress() RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks
  SET progress = COALESCE((
    SELECT (COUNT(*) FILTER (WHERE complete_status = 'DONE')::float / COUNT(*)) * 100
    FROM activities
    WHERE task_id = NEW.task_id
  ), 0)
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_task_progress();