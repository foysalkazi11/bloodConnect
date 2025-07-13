-- Real-time Notification System Migration
-- Create tables for comprehensive notification management

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('direct_message', 'group_message', 'club_announcement', 'club_event', 'join_request', 'join_approved', 'join_rejected')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID, -- ID of the related entity (message, announcement, event, etc.)
    related_type VARCHAR(50), -- Type of related entity (club, event, user, etc.)
    action_url TEXT, -- URL to navigate to when notification is clicked
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create user notification settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    direct_messages BOOLEAN DEFAULT TRUE,
    group_messages BOOLEAN DEFAULT TRUE,
    club_announcements BOOLEAN DEFAULT TRUE,
    club_events BOOLEAN DEFAULT TRUE,
    join_requests BOOLEAN DEFAULT TRUE,
    join_responses BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create notification subscriptions table for real-time updates
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subscription_type VARCHAR(50) NOT NULL,
    subscription_id TEXT NOT NULL, -- club_id, conversation_id, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subscription_type, subscription_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_id, related_type);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON notification_subscriptions(user_id, is_active);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications table
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for user_notification_settings table
CREATE POLICY "Users can view their own notification settings" ON user_notification_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification settings" ON user_notification_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification settings" ON user_notification_settings
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for notification_subscriptions table
CREATE POLICY "Users can view their own notification subscriptions" ON notification_subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification subscriptions" ON notification_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification subscriptions" ON notification_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification subscriptions" ON notification_subscriptions
    FOR DELETE USING (user_id = auth.uid());

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title TEXT,
    p_message TEXT,
    p_related_id UUID DEFAULT NULL,
    p_related_type VARCHAR(50) DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    user_settings RECORD;
BEGIN
    -- Check if user has this notification type enabled
    SELECT * INTO user_settings 
    FROM user_notification_settings 
    WHERE user_id = p_user_id;
    
    -- If no settings exist, create default settings
    IF NOT FOUND THEN
        INSERT INTO user_notification_settings (user_id) VALUES (p_user_id);
        user_settings.direct_messages := TRUE;
        user_settings.group_messages := TRUE;
        user_settings.club_announcements := TRUE;
        user_settings.club_events := TRUE;
        user_settings.join_requests := TRUE;
        user_settings.join_responses := TRUE;
    END IF;
    
    -- Check if notification type is enabled for user
    IF (p_type = 'direct_message' AND NOT user_settings.direct_messages) OR
       (p_type = 'group_message' AND NOT user_settings.group_messages) OR
       (p_type = 'club_announcement' AND NOT user_settings.club_announcements) OR
       (p_type = 'club_event' AND NOT user_settings.club_events) OR
       (p_type IN ('join_request', 'join_approved', 'join_rejected') AND NOT user_settings.join_requests) THEN
        RETURN NULL;
    END IF;
    
    -- Create the notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_id,
        related_type,
        action_url,
        expires_at
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_related_id,
        p_related_type,
        p_action_url,
        p_expires_at
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
    WHERE id = notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read() RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
    WHERE user_id = auth.uid() AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count() RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications 
    WHERE user_id = auth.uid() AND is_read = FALSE AND is_dismissed = FALSE;
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to dismiss notification
CREATE OR REPLACE FUNCTION dismiss_notification(notification_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET is_dismissed = TRUE 
    WHERE id = notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create notifications for direct messages
CREATE OR REPLACE FUNCTION create_direct_message_notification() RETURNS TRIGGER AS $$
BEGIN
    -- Don't create notification for sender
    IF NEW.sender_id != NEW.recipient_id THEN
        PERFORM create_notification(
            NEW.recipient_id,
            'direct_message',
            'New message from ' || (SELECT name FROM user_profiles WHERE id = NEW.sender_id),
            NEW.content,
            NEW.conversation_id,
            'conversation',
            '/clubs/' || (SELECT club_id FROM conversation_participants cp WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id != NEW.sender_id LIMIT 1) || '/direct-message/' || NEW.sender_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create notifications for club messages
CREATE OR REPLACE FUNCTION create_club_message_notification() RETURNS TRIGGER AS $$
DECLARE
    member_record RECORD;
    club_name TEXT;
    sender_name TEXT;
BEGIN
    -- Get club and sender info
    SELECT name INTO club_name FROM user_profiles WHERE id = NEW.club_id;
    SELECT name INTO sender_name FROM user_profiles WHERE id = NEW.sender_id;
    
    -- Create notifications for all active club members except sender
    FOR member_record IN 
        SELECT member_id 
        FROM club_members 
        WHERE club_id = NEW.club_id 
        AND is_active = TRUE 
        AND member_id != NEW.sender_id
    LOOP
        PERFORM create_notification(
            member_record.member_id,
            'group_message',
            'New message in ' || club_name,
            sender_name || ': ' || NEW.content,
            NEW.club_id,
            'club',
            '/clubs/' || NEW.club_id || '/chat'
        );
    END LOOP;
    
    -- Also notify club owner if they're not the sender
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.club_id AND id != NEW.sender_id) THEN
        PERFORM create_notification(
            NEW.club_id,
            'group_message',
            'New message in ' || club_name,
            sender_name || ': ' || NEW.content,
            NEW.club_id,
            'club',
            '/clubs/' || NEW.club_id || '/chat'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create notifications for club announcements
CREATE OR REPLACE FUNCTION create_club_announcement_notification() RETURNS TRIGGER AS $$
DECLARE
    member_record RECORD;
    club_name TEXT;
    author_name TEXT;
BEGIN
    -- Get club and author info
    SELECT name INTO club_name FROM user_profiles WHERE id = NEW.club_id;
    SELECT name INTO author_name FROM user_profiles WHERE id = NEW.author_id;
    
    -- Create notifications for all active club members except author
    FOR member_record IN 
        SELECT member_id 
        FROM club_members 
        WHERE club_id = NEW.club_id 
        AND is_active = TRUE 
        AND member_id != NEW.author_id
    LOOP
        PERFORM create_notification(
            member_record.member_id,
            'club_announcement',
            'New announcement in ' || club_name,
            NEW.title,
            NEW.id,
            'announcement',
            '/clubs/' || NEW.club_id || '/announcements'
        );
    END LOOP;
    
    -- Also notify club owner if they're not the author
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.club_id AND id != NEW.author_id) THEN
        PERFORM create_notification(
            NEW.club_id,
            'club_announcement',
            'New announcement in ' || club_name,
            NEW.title,
            NEW.id,
            'announcement',
            '/clubs/' || NEW.club_id || '/announcements'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create notifications for club events
CREATE OR REPLACE FUNCTION create_club_event_notification() RETURNS TRIGGER AS $$
DECLARE
    member_record RECORD;
    club_name TEXT;
    organizer_name TEXT;
BEGIN
    -- Get club and organizer info
    SELECT name INTO club_name FROM user_profiles WHERE id = NEW.club_id;
    SELECT name INTO organizer_name FROM user_profiles WHERE id = NEW.organizer_id;
    
    -- Create notifications for all active club members except organizer
    FOR member_record IN 
        SELECT member_id 
        FROM club_members 
        WHERE club_id = NEW.club_id 
        AND is_active = TRUE 
        AND member_id != NEW.organizer_id
    LOOP
        PERFORM create_notification(
            member_record.member_id,
            'club_event',
            'New event in ' || club_name,
            NEW.title,
            NEW.id,
            'event',
            '/clubs/' || NEW.club_id || '/events'
        );
    END LOOP;
    
    -- Also notify club owner if they're not the organizer
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.club_id AND id != NEW.organizer_id) THEN
        PERFORM create_notification(
            NEW.club_id,
            'club_event',
            'New event in ' || club_name,
            NEW.title,
            NEW.id,
            'event',
            '/clubs/' || NEW.club_id || '/events'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create notifications for join requests
CREATE OR REPLACE FUNCTION create_join_request_notification() RETURNS TRIGGER AS $$
DECLARE
    club_name TEXT;
    user_name TEXT;
BEGIN
    -- Only create notification for new pending requests
    IF NEW.status = 'pending' THEN
        -- Get club and user info
        SELECT name INTO club_name FROM user_profiles WHERE id = NEW.club_id;
        SELECT name INTO user_name FROM user_profiles WHERE id = NEW.user_id;
        
        -- Notify club owner
        PERFORM create_notification(
            NEW.club_id,
            'join_request',
            'New join request for ' || club_name,
            user_name || ' wants to join your club',
            NEW.id,
            'join_request',
            '/clubs/' || NEW.club_id || '/members?tab=requests'
        );
        
        -- Also notify club admins
        FOR admin_record IN 
            SELECT member_id 
            FROM club_members 
            WHERE club_id = NEW.club_id 
            AND is_active = TRUE 
            AND role IN ('admin', 'moderator')
        LOOP
            PERFORM create_notification(
                admin_record.member_id,
                'join_request',
                'New join request for ' || club_name,
                user_name || ' wants to join the club',
                NEW.id,
                'join_request',
                '/clubs/' || NEW.club_id || '/members?tab=requests'
            );
        END LOOP;
    -- Create notification for status changes
    ELSIF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
        SELECT name INTO club_name FROM user_profiles WHERE id = NEW.club_id;
        
        PERFORM create_notification(
            NEW.user_id,
            CASE WHEN NEW.status = 'approved' THEN 'join_approved' ELSE 'join_rejected' END,
            'Join request ' || NEW.status,
            'Your request to join ' || club_name || ' has been ' || NEW.status,
            NEW.club_id,
            'club',
            CASE WHEN NEW.status = 'approved' THEN '/clubs/' || NEW.club_id ELSE '/clubs' END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_direct_message_notification ON direct_messages;
CREATE TRIGGER trigger_direct_message_notification
    AFTER INSERT ON direct_messages
    FOR EACH ROW EXECUTE FUNCTION create_direct_message_notification();

DROP TRIGGER IF EXISTS trigger_club_message_notification ON club_messages;
CREATE TRIGGER trigger_club_message_notification
    AFTER INSERT ON club_messages
    FOR EACH ROW EXECUTE FUNCTION create_club_message_notification();

DROP TRIGGER IF EXISTS trigger_club_announcement_notification ON club_announcements;
CREATE TRIGGER trigger_club_announcement_notification
    AFTER INSERT ON club_announcements
    FOR EACH ROW EXECUTE FUNCTION create_club_announcement_notification();

DROP TRIGGER IF EXISTS trigger_club_event_notification ON club_events;
CREATE TRIGGER trigger_club_event_notification
    AFTER INSERT ON club_events
    FOR EACH ROW EXECUTE FUNCTION create_club_event_notification();

DROP TRIGGER IF EXISTS trigger_join_request_notification ON club_join_requests;
CREATE TRIGGER trigger_join_request_notification
    AFTER INSERT OR UPDATE ON club_join_requests
    FOR EACH ROW EXECUTE FUNCTION create_join_request_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notification_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_subscriptions;

-- Set replica identity for realtime
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE user_notification_settings REPLICA IDENTITY FULL;
ALTER TABLE notification_subscriptions REPLICA IDENTITY FULL;

COMMENT ON TABLE notifications IS 'Stores all user notifications for the real-time notification system';
COMMENT ON TABLE user_notification_settings IS 'User preferences for different types of notifications';
COMMENT ON TABLE notification_subscriptions IS 'Active subscriptions for real-time notifications'; 