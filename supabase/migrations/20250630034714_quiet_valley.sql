/*
  # Club Join Requests System

  1. New Tables
    - `club_join_requests` - Track requests to join clubs
    
  2. Security
    - Enable RLS on the table
    - Add policies for users to create and view their own requests
    - Add policies for club admins to manage requests
*/

-- Create club_join_requests table
CREATE TABLE IF NOT EXISTS club_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Enable RLS
ALTER TABLE club_join_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for club_join_requests
CREATE POLICY "Users can view their own join requests"
  ON club_join_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create join requests"
  ON club_join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Club admins can view join requests"
  ON club_join_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_join_requests.club_id
      AND club_members.member_id = auth.uid()
      AND club_members.role IN ('admin', 'moderator')
      AND club_members.is_active = true
    )
  );
  
CREATE POLICY "Club admins can update join requests"
  ON club_join_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_join_requests.club_id
      AND club_members.member_id = auth.uid()
      AND club_members.role IN ('admin', 'moderator')
      AND club_members.is_active = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_club_join_requests_club_id ON club_join_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_club_join_requests_user_id ON club_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_club_join_requests_status ON club_join_requests(status);

-- Create trigger for updated_at
CREATE TRIGGER update_club_join_requests_updated_at
  BEFORE UPDATE ON club_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle approved requests
CREATE OR REPLACE FUNCTION handle_approved_join_request()
RETURNS TRIGGER AS $$
BEGIN
  -- If request was approved, add user to club_members
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO club_members (club_id, member_id, role, is_active)
    VALUES (NEW.club_id, NEW.user_id, 'member', true)
    ON CONFLICT (club_id, member_id) 
    DO UPDATE SET is_active = true;
    
    -- Create notification for the user
    INSERT INTO club_notifications (
      club_id, 
      user_id, 
      type, 
      title, 
      message
    )
    VALUES (
      NEW.club_id,
      NEW.user_id,
      'new_member',
      'Join Request Approved',
      'Your request to join the club has been approved. Welcome to the club!'
    );
  END IF;
  
  -- If request was rejected, create notification
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    INSERT INTO club_notifications (
      club_id, 
      user_id, 
      type, 
      title, 
      message
    )
    VALUES (
      NEW.club_id,
      NEW.user_id,
      'new_member',
      'Join Request Rejected',
      'Your request to join the club has been rejected.'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for handling approved requests
CREATE TRIGGER on_join_request_status_change
  AFTER UPDATE OF status ON club_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_approved_join_request();

-- Create function to create join requests table via RPC
CREATE OR REPLACE FUNCTION create_join_requests_table()
RETURNS void AS $$
BEGIN
  -- This function is a no-op since the table is created in the migration
  -- It exists to be called from the client if the table doesn't exist
  RETURN;
END;
$$ LANGUAGE plpgsql;