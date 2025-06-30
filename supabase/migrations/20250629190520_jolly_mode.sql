/*
  # Gallery System Implementation

  1. New Tables
    - `gallery_posts` - Stores user donation stories with images
    - `gallery_post_likes` - Tracks likes on gallery posts
    - `gallery_post_comments` - Stores comments on gallery posts

  2. Security
    - Enable RLS on all tables
    - Public can view posts, likes, and comments
    - Only authenticated users can create, update, and delete their own content
    - Storage policies for secure image uploads

  3. Performance
    - Indexes on frequently queried columns
    - Triggers for automatic timestamp updates
*/

-- Create gallery_posts table
CREATE TABLE IF NOT EXISTS gallery_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  caption text NOT NULL,
  location text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create gallery_post_likes table
CREATE TABLE IF NOT EXISTS gallery_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES gallery_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create gallery_post_comments table
CREATE TABLE IF NOT EXISTS gallery_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES gallery_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gallery_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_post_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for gallery_posts
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gallery_posts_user_id ON gallery_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_created_at ON gallery_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_gallery_post_likes_post_id ON gallery_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_likes_user_id ON gallery_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_comments_post_id ON gallery_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_comments_user_id ON gallery_post_comments(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_gallery_posts_updated_at
  BEFORE UPDATE ON gallery_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gallery_post_comments_updated_at
  BEFORE UPDATE ON gallery_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for gallery images
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('media', 'media', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Set up storage policies
CREATE POLICY "Public can view media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can update their own media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );