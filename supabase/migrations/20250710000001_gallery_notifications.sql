-- Gallery Notifications Migration
-- Add notification triggers for gallery posts, likes, and comments

-- Update notification type check to include gallery notifications
DO $$
BEGIN
  -- Update the check constraint to include new gallery notification types
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_type_check' 
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('direct_message', 'group_message', 'club_announcement', 'club_event', 'join_request', 'join_approved', 'join_rejected', 'gallery_like', 'gallery_comment', 'social_interaction'));
  END IF;
END $$;

-- Function to create notification for gallery post likes
CREATE OR REPLACE FUNCTION create_gallery_like_notification() RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    liker_name TEXT;
    post_caption TEXT;
BEGIN
    -- Get post author and liker info
    SELECT user_id, caption INTO post_author_id, post_caption 
    FROM gallery_posts WHERE id = NEW.post_id;
    
    SELECT name INTO liker_name 
    FROM user_profiles WHERE id = NEW.user_id;
    
    -- Don't create notification if user likes their own post
    IF post_author_id != NEW.user_id THEN
        PERFORM create_notification(
            post_author_id,
            'social_interaction',
            COALESCE(liker_name, 'Someone') || ' liked your post',
            'Your gallery post "' || LEFT(COALESCE(post_caption, 'your post'), 50) || 
            CASE WHEN LENGTH(COALESCE(post_caption, '')) > 50 THEN '...' ELSE '' END || '" received a like',
            NEW.post_id,
            'gallery_post',
            '/(tabs)/gallery'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for gallery post comments
CREATE OR REPLACE FUNCTION create_gallery_comment_notification() RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    commenter_name TEXT;
    post_caption TEXT;
BEGIN
    -- Get post author and commenter info
    SELECT user_id, caption INTO post_author_id, post_caption 
    FROM gallery_posts WHERE id = NEW.post_id;
    
    SELECT name INTO commenter_name 
    FROM user_profiles WHERE id = NEW.user_id;
    
    -- Don't create notification if user comments on their own post
    IF post_author_id != NEW.user_id THEN
        PERFORM create_notification(
            post_author_id,
            'social_interaction',
            COALESCE(commenter_name, 'Someone') || ' commented on your post',
            COALESCE(commenter_name, 'Someone') || ' commented: "' || 
            LEFT(NEW.content, 100) || 
            CASE WHEN LENGTH(NEW.content) > 100 THEN '..."' ELSE '"' END,
            NEW.post_id,
            'gallery_post',
            '/(tabs)/gallery'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for gallery notifications
DROP TRIGGER IF EXISTS trigger_gallery_like_notification ON gallery_post_likes;
CREATE TRIGGER trigger_gallery_like_notification
    AFTER INSERT ON gallery_post_likes
    FOR EACH ROW EXECUTE FUNCTION create_gallery_like_notification();

DROP TRIGGER IF EXISTS trigger_gallery_comment_notification ON gallery_post_comments;
CREATE TRIGGER trigger_gallery_comment_notification
    AFTER INSERT ON gallery_post_comments
    FOR EACH ROW EXECUTE FUNCTION create_gallery_comment_notification();

-- Add gallery notification types to priority config if not exists
INSERT INTO notification_priority_config (
    notification_type,
    priority_level,
    can_be_batched,
    max_delay_minutes,
    requires_permission
) VALUES 
(
    'social_interaction',
    'low',
    true,
    15,
    false
)
ON CONFLICT (notification_type) DO UPDATE SET
    priority_level = EXCLUDED.priority_level,
    can_be_batched = EXCLUDED.can_be_batched,
    max_delay_minutes = EXCLUDED.max_delay_minutes,
    requires_permission = EXCLUDED.requires_permission;

COMMENT ON FUNCTION create_gallery_like_notification() IS 'Creates notifications when users like gallery posts';
COMMENT ON FUNCTION create_gallery_comment_notification() IS 'Creates notifications when users comment on gallery posts'; 