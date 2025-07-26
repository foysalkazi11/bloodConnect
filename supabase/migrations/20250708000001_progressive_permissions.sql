/*
  # Progressive Permissions System

  1. New Tables
    - `user_permission_state` - Track progressive permission flow and system permission timing
    
  2. Security
    - Enable RLS on the table
    - Add policies for users to manage their own permission state
    - Allow users to view and update only their own permission data

  3. Features
    - Track when users see contextual permission requests
    - Record user responses (accepted/declined)
    - Manage timing of system permission requests
    - Support analytics for permission request effectiveness
*/

-- Create user_permission_state table for progressive permissions
CREATE TABLE IF NOT EXISTS user_permission_state (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  has_system_permission boolean DEFAULT false,
  permission_requested_at timestamptz,
  permission_granted_at timestamptz,
  contexts_seen text[] DEFAULT '{}',
  contexts_accepted text[] DEFAULT '{}',
  contexts_declined text[] DEFAULT '{}',
  last_prompt_shown timestamptz,
  total_prompts_shown integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_permission_state ENABLE ROW LEVEL SECURITY;

-- Create policies for user_permission_state
CREATE POLICY "Users can view their own permission state"
  ON user_permission_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own permission state"
  ON user_permission_state
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own permission state"
  ON user_permission_state
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own permission state"
  ON user_permission_state
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_permission_state_user_id ON user_permission_state(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_state_system_permission ON user_permission_state(has_system_permission);
CREATE INDEX IF NOT EXISTS idx_user_permission_state_last_prompt ON user_permission_state(last_prompt_shown);

-- Create trigger for updated_at
CREATE TRIGGER update_user_permission_state_updated_at
  BEFORE UPDATE ON user_permission_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get or create permission state
CREATE OR REPLACE FUNCTION get_or_create_permission_state(p_user_id uuid)
RETURNS user_permission_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  state_record user_permission_state;
BEGIN
  -- Try to get existing state
  SELECT * INTO state_record
  FROM user_permission_state
  WHERE user_id = p_user_id;

  -- If not found, create initial state
  IF NOT FOUND THEN
    INSERT INTO user_permission_state (user_id)
    VALUES (p_user_id)
    RETURNING * INTO state_record;
  END IF;

  RETURN state_record;
END;
$$;

-- Create function to update permission context
CREATE OR REPLACE FUNCTION update_permission_context(
  p_user_id uuid,
  p_context_key text,
  p_response text -- 'seen', 'accepted', 'declined'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_seen text[];
  current_accepted text[];
  current_declined text[];
BEGIN
  -- Get current arrays
  SELECT contexts_seen, contexts_accepted, contexts_declined
  INTO current_seen, current_accepted, current_declined
  FROM user_permission_state
  WHERE user_id = p_user_id;

  -- Handle the response
  CASE p_response
    WHEN 'seen' THEN
      -- Add to seen if not already there
      IF NOT (p_context_key = ANY(current_seen)) THEN
        current_seen := current_seen || p_context_key;
        
        UPDATE user_permission_state
        SET contexts_seen = current_seen,
            total_prompts_shown = total_prompts_shown + 1,
            last_prompt_shown = now(),
            updated_at = now()
        WHERE user_id = p_user_id;
      END IF;
      
    WHEN 'accepted' THEN
      -- Add to accepted if not already there
      IF NOT (p_context_key = ANY(current_accepted)) THEN
        current_accepted := current_accepted || p_context_key;
        
        UPDATE user_permission_state
        SET contexts_accepted = current_accepted,
            updated_at = now()
        WHERE user_id = p_user_id;
      END IF;
      
    WHEN 'declined' THEN
      -- Add to declined if not already there
      IF NOT (p_context_key = ANY(current_declined)) THEN
        current_declined := current_declined || p_context_key;
        
        UPDATE user_permission_state
        SET contexts_declined = current_declined,
            updated_at = now()
        WHERE user_id = p_user_id;
      END IF;
  END CASE;

  RETURN true;
END;
$$;

-- Create function to record system permission request
CREATE OR REPLACE FUNCTION record_system_permission_request(
  p_user_id uuid,
  p_granted boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_permission_state
  SET has_system_permission = p_granted,
      permission_requested_at = now(),
      permission_granted_at = CASE WHEN p_granted THEN now() ELSE NULL END,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Create function to get permission stats (for analytics)
CREATE OR REPLACE FUNCTION get_permission_stats()
RETURNS TABLE (
  total_users bigint,
  users_with_system_permission bigint,
  users_with_contexts_seen bigint,
  users_with_contexts_accepted bigint,
  avg_prompts_per_user numeric,
  permission_grant_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE has_system_permission = true) as users_with_system_permission,
    COUNT(*) FILTER (WHERE array_length(contexts_seen, 1) > 0) as users_with_contexts_seen,
    COUNT(*) FILTER (WHERE array_length(contexts_accepted, 1) > 0) as users_with_contexts_accepted,
    AVG(total_prompts_shown) as avg_prompts_per_user,
    CASE 
      WHEN COUNT(*) FILTER (WHERE permission_requested_at IS NOT NULL) > 0 THEN
        (COUNT(*) FILTER (WHERE has_system_permission = true)::numeric / 
         COUNT(*) FILTER (WHERE permission_requested_at IS NOT NULL)::numeric) * 100
      ELSE 0
    END as permission_grant_rate
  FROM user_permission_state;
END;
$$; 