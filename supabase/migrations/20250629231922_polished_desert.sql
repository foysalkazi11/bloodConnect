/*
  # Gallery System for Blood Donation Stories

  1. New Tables
    - `gallery_posts` - User donation stories with images
    - `gallery_post_likes` - Track post likes
    - `gallery_post_comments` - Store post comments

  2. Storage
    - Create media bucket for gallery images
    - Set up proper storage policies with auth.uid() casting

  3. Security
    - Enable RLS on all tables
    - Add policies for public viewing and authenticated interactions
    - Fix storage policies to properly handle user-specific folders
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

-- Create policies for gallery_posts (with existence checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_posts' AND policyname = 'Anyone can view gallery posts'
  ) THEN
    CREATE POLICY "Anyone can view gallery posts"
      ON gallery_posts
      FOR SELECT
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_posts' AND policyname = 'Authenticated users can create gallery posts'
  ) THEN
    CREATE POLICY "Authenticated users can create gallery posts"
      ON gallery_posts
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_posts' AND policyname = 'Users can update their own gallery posts'
  ) THEN
    CREATE POLICY "Users can update their own gallery posts"
      ON gallery_posts
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_posts' AND policyname = 'Users can delete their own gallery posts'
  ) THEN
    CREATE POLICY "Users can delete their own gallery posts"
      ON gallery_posts
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for gallery_post_likes (with existence checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_post_likes' AND policyname = 'Anyone can view gallery post likes'
  ) THEN
    CREATE POLICY "Anyone can view gallery post likes"
      ON gallery_post_likes
      FOR SELECT
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_post_likes' AND policyname = 'Authenticated users can like gallery posts'
  ) THEN
    CREATE POLICY "Authenticated users can like gallery posts"
      ON gallery_post_likes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_post_likes' AND policyname = 'Users can remove their own likes'
  ) THEN
    CREATE POLICY "Users can remove their own likes"
      ON gallery_post_likes
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for gallery_post_comments (with existence checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_post_comments' AND policyname = 'Anyone can view gallery post comments'
  ) THEN
    CREATE POLICY "Anyone can view gallery post comments"
      ON gallery_post_comments
      FOR SELECT
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_post_comments' AND policyname = 'Authenticated users can comment on gallery posts'
  ) THEN
    CREATE POLICY "Authenticated users can comment on gallery posts"
      ON gallery_post_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_post_comments' AND policyname = 'Users can update their own comments'
  ) THEN
    CREATE POLICY "Users can update their own comments"
      ON gallery_post_comments
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gallery_post_comments' AND policyname = 'Users can delete their own comments'
  ) THEN
    CREATE POLICY "Users can delete their own comments"
      ON gallery_post_comments
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gallery_posts_user_id ON gallery_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_created_at ON gallery_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_gallery_post_likes_post_id ON gallery_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_likes_user_id ON gallery_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_comments_post_id ON gallery_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_post_comments_user_id ON gallery_post_comments(user_id);

-- Create triggers for updated_at (with existence checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_gallery_posts_updated_at'
  ) THEN
    CREATE TRIGGER update_gallery_posts_updated_at
      BEFORE UPDATE ON gallery_posts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_gallery_post_comments_updated_at'
  ) THEN
    CREATE TRIGGER update_gallery_post_comments_updated_at
      BEFORE UPDATE ON gallery_post_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create storage bucket for gallery images (if it doesn't exist)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('media', 'media', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Set up storage policies (with existence checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public can view media'
  ) THEN
    CREATE POLICY "Public can view media"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'media');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload media'
  ) THEN
    CREATE POLICY "Authenticated users can upload media"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'media' AND
        (storage.foldername(name))[1] = 'gallery' AND
        (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update their own media'
  ) THEN
    CREATE POLICY "Users can update their own media"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'media' AND
        (storage.foldername(name))[1] = 'gallery' AND
        (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete their own media'
  ) THEN
    CREATE POLICY "Users can delete their own media"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'media' AND
        (storage.foldername(name))[1] = 'gallery' AND
        (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;
END $$;