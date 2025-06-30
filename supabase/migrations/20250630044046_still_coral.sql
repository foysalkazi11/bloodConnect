/*
  # Gallery Posts and Club Join Requests

  1. New Tables
    - `gallery_posts` - Store user gallery posts
    - `gallery_post_likes` - Track post likes
    - `gallery_post_comments` - Store post comments
    - `club_join_requests` - Handle club membership requests

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Create function to handle approved join requests
*/

-- Create gallery_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS gallery_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  caption text NOT NULL,
  location text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create gallery_post_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS gallery_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES gallery_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create gallery_post_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS gallery_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES gallery_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create club_join_requests table if it doesn't exist
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

-- Enable RLS on all tables
ALTER TABLE gallery_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_join_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for gallery_posts
-- First drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view gallery posts" ON gallery_posts;
DROP POLICY IF EXISTS "Authenticated users can create gallery posts" ON gallery_posts;
DROP POLICY IF EXISTS "Users can update their own gallery posts" ON gallery_posts;
DROP POLICY IF EXISTS "Users can delete their own gallery posts" ON gallery_posts;

-- Create new policies
CREATE POLICY "Anyone can view gallery posts"
  ON gallery_posts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create gallery posts"
  ON gallery_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gallery posts"
  ON gallery_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gallery posts"
  ON gallery_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for gallery_post_likes
DROP POLICY IF EXISTS "Anyone can view gallery post likes" ON gallery_post_likes;
DROP POLICY IF EXISTS "Authenticated users can like gallery posts" ON gallery_post_likes;
DROP POLICY IF EXISTS "Users can remove their own likes" ON gallery_post_likes;

CREATE POLICY "Anyone can view gallery post likes"
  ON gallery_post_likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can like gallery posts"
  ON gallery_post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes"
  ON gallery_post_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for gallery_post_comments
DROP POLICY IF EXISTS "Anyone can view gallery post comments" ON gallery_post_comments;
DROP POLICY IF EXISTS "Authenticated users can comment on gallery posts" ON gallery_post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON gallery_post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON gallery_post_comments;

CREATE POLICY "Anyone can view gallery post comments"
  ON gallery_post_comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can comment on gallery posts"
  ON gallery_post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON gallery_post_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON gallery_post_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for club_join_requests
DROP POLICY IF EXISTS "Users can view their own join requests" ON club_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON club_join_requests;
DROP POLICY IF EXISTS "Club admins can view join requests" ON club_join_requests;
DROP POLICY IF EXISTS "Club admins can update join requests" ON club_join_requests;

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
CREATE INDEX IF NOT EXISTS idx_gallery_posts_user_id ON gallery_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_created_at ON gallery_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_gallery_post_likes_post_id ON gallery_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_likes_user_id ON gallery_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_comments_post_id ON gallery_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_comments_user_id ON gallery_post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_club_join_requests_club_id ON club_join_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_club_join_requests_user_id ON club_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_club_join_requests_status ON club_join_requests(status);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION create_trigger_if_not_exists(
  trigger_name text,
  table_name text,
  trigger_procedure text
) RETURNS void AS $$
DECLARE
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = trigger_name
  ) INTO trigger_exists;
  
  IF NOT trigger_exists THEN
    EXECUTE format('
      CREATE TRIGGER %I
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION %I()', 
      trigger_name, table_name, trigger_procedure);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_trigger_if_not_exists(
  'update_gallery_posts_updated_at',
  'gallery_posts',
  'update_updated_at_column'
);

SELECT create_trigger_if_not_exists(
  'update_gallery_post_comments_updated_at',
  'gallery_post_comments',
  'update_updated_at_column'
);

SELECT create_trigger_if_not_exists(
  'update_club_join_requests_updated_at',
  'club_join_requests',
  'update_updated_at_column'
);

-- Create function to handle approved requests if it doesn't exist
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
CREATE OR REPLACE FUNCTION create_status_trigger_if_not_exists() 
RETURNS void AS $$
DECLARE
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_join_request_status_change'
  ) INTO trigger_exists;
  
  IF NOT trigger_exists THEN
    EXECUTE '
      CREATE TRIGGER on_join_request_status_change
      AFTER UPDATE OF status ON club_join_requests
      FOR EACH ROW
      EXECUTE FUNCTION handle_approved_join_request()';
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_status_trigger_if_not_exists();

-- Create storage bucket for gallery images
CREATE OR REPLACE FUNCTION create_bucket_if_not_exists() 
RETURNS void AS $$
DECLARE
  bucket_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'media'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('media', 'media', true);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_bucket_if_not_exists();

-- Set up storage policies
CREATE OR REPLACE FUNCTION create_storage_policy_if_not_exists() 
RETURNS void AS $$
DECLARE
  policy_exists boolean;
BEGIN
  -- Check for public view policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public can view media'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE '
      CREATE POLICY "Public can view media"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = ''media'')';
  END IF;
  
  -- Check for upload policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload media'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    EXECUTE 'DROP POLICY "Authenticated users can upload media" ON storage.objects';
  END IF;
  
  EXECUTE '
    CREATE POLICY "Authenticated users can upload media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''media'' AND
      (storage.foldername(name))[1] = ''gallery'' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )';
    
  -- Check for update policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update their own media'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    EXECUTE 'DROP POLICY "Users can update their own media" ON storage.objects';
  END IF;
  
  EXECUTE '
    CREATE POLICY "Users can update their own media"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = ''media'' AND
      (storage.foldername(name))[1] = ''gallery'' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )';
    
  -- Check for delete policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete their own media'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    EXECUTE 'DROP POLICY "Users can delete their own media" ON storage.objects';
  END IF;
  
  EXECUTE '
    CREATE POLICY "Users can delete their own media"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''media'' AND
      (storage.foldername(name))[1] = ''gallery'' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )';
END;
$$ LANGUAGE plpgsql;

SELECT create_storage_policy_if_not_exists();