/*
  # Club Communication System

  1. New Tables
    - `club_members` - Track club memberships
    - `club_posts` - Store club posts and announcements
    - `club_post_likes` - Track post likes
    - `club_post_comments` - Store post comments
    - `club_notifications` - Handle club notifications

  2. Security
    - Enable RLS on all tables
    - Add policies for club members to interact with content
    - Ensure proper access control for club-specific content
*/

-- Create club_members table
CREATE TABLE IF NOT EXISTS club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  member_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(club_id, member_id)
);

-- Create club_posts table
CREATE TABLE IF NOT EXISTS club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  author_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  post_type text DEFAULT 'general' CHECK (post_type IN ('general', 'announcement')),
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create club_post_likes table
CREATE TABLE IF NOT EXISTS club_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES club_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create club_post_comments table
CREATE TABLE IF NOT EXISTS club_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES club_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create club_notifications table
CREATE TABLE IF NOT EXISTS club_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_post', 'new_comment', 'new_member', 'announcement')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_notifications ENABLE ROW LEVEL SECURITY;

-- Club members policies
CREATE POLICY "Club members can read club membership"
  ON club_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_members.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Users can join clubs"
  ON club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can leave clubs"
  ON club_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Club posts policies
CREATE POLICY "Club members can read posts"
  ON club_posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_posts.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Club members can create posts"
  ON club_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_posts.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Authors can update own posts"
  ON club_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Club post likes policies
CREATE POLICY "Club members can read likes"
  ON club_post_likes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_posts cp
      JOIN club_members cm ON cp.club_id = cm.club_id
      WHERE cp.id = club_post_likes.post_id
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Club members can like posts"
  ON club_post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM club_posts cp
      JOIN club_members cm ON cp.club_id = cm.club_id
      WHERE cp.id = club_post_likes.post_id
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Users can unlike posts"
  ON club_post_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Club post comments policies
CREATE POLICY "Club members can read comments"
  ON club_post_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_posts cp
      JOIN club_members cm ON cp.club_id = cm.club_id
      WHERE cp.id = club_post_comments.post_id
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Club members can create comments"
  ON club_post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM club_posts cp
      JOIN club_members cm ON cp.club_id = cm.club_id
      WHERE cp.id = club_post_comments.post_id
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Authors can update own comments"
  ON club_post_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Club notifications policies
CREATE POLICY "Users can read own notifications"
  ON club_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON club_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON club_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_member_id ON club_members(member_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_club_id ON club_posts(club_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_created_at ON club_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_post_likes_post_id ON club_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_club_post_comments_post_id ON club_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_club_notifications_user_id ON club_notifications(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_club_posts_updated_at
  BEFORE UPDATE ON club_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_post_comments_updated_at
  BEFORE UPDATE ON club_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to notify club members of new posts
CREATE OR REPLACE FUNCTION notify_club_members_new_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for all active club members except the author
  INSERT INTO club_notifications (club_id, user_id, type, title, message)
  SELECT 
    NEW.club_id,
    cm.member_id,
    CASE WHEN NEW.post_type = 'announcement' THEN 'announcement' ELSE 'new_post' END,
    CASE WHEN NEW.post_type = 'announcement' THEN 'New Announcement' ELSE 'New Post' END,
    CASE WHEN NEW.post_type = 'announcement' 
         THEN 'A new announcement has been posted in your club'
         ELSE 'A new post has been shared in your club'
    END
  FROM club_members cm
  WHERE cm.club_id = NEW.club_id 
    AND cm.member_id != NEW.author_id 
    AND cm.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new post notifications
CREATE TRIGGER on_new_club_post
  AFTER INSERT ON club_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_club_members_new_post();