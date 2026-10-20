-- Create the trigger function to update project progress
CREATE OR REPLACE FUNCTION update_project_progress() RETURNS TRIGGER AS $$
BEGIN
 -- Update the project's progress based on the completion status of its tasks
  UPDATE projects
  SET progress = COALESCE((
    -- Calculation: Average of task progress
    SELECT AVG(progress)
    FROM tasks
    WHERE project_id = NEW.project_id
  ), 0)  -- if there's no tasks are found, default progress 0
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to call the update_project_progress() function after INSERT, UPDATE, or DELETE on task
CREATE TRIGGER update_project_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks  -- Trigger when there's changes on tasks table
FOR EACH ROW
EXECUTE FUNCTION update_project_progress();  -- Call the update_project_progress function