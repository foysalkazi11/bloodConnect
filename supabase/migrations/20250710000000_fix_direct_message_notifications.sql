-- Fix Direct Message Notification Issues
-- This migration fixes the create_direct_message_notification function that was causing errors

-- Drop the existing problematic function
DROP FUNCTION IF EXISTS create_direct_message_notification() CASCADE;

-- Create the corrected function
CREATE OR REPLACE FUNCTION create_direct_message_notification() RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    club_id_for_url UUID;
BEGIN
    -- Don't create notification for sender
    IF NEW.sender_id != NEW.receiver_id THEN
        -- Get sender name
        SELECT name INTO sender_name FROM user_profiles WHERE id = NEW.sender_id;
        
        -- Try to find a shared club for URL generation
        -- This finds clubs where both users are members
        SELECT cm1.club_id INTO club_id_for_url
        FROM club_members cm1
        INNER JOIN club_members cm2 ON cm1.club_id = cm2.club_id
        WHERE cm1.member_id = NEW.sender_id 
        AND cm2.member_id = NEW.receiver_id
        AND cm1.is_active = TRUE 
        AND cm2.is_active = TRUE
        LIMIT 1;
        
        -- Create notification with proper action URL
        PERFORM create_notification(
            NEW.receiver_id,
            'direct_message',
            'New message from ' || COALESCE(sender_name, 'Unknown User'),
            NEW.content,
            NEW.conversation_id::uuid,
            'conversation',
            CASE 
                WHEN club_id_for_url IS NOT NULL THEN 
                    '/(tabs)/clubs/' || club_id_for_url || '/direct-message/' || NEW.sender_id
                ELSE 
                    '/(tabs)/clubs' 
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_direct_message_notification ON direct_messages;
CREATE TRIGGER trigger_direct_message_notification
    AFTER INSERT ON direct_messages
    FOR EACH ROW EXECUTE FUNCTION create_direct_message_notification();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_direct_message_notification() TO authenticated;

COMMENT ON FUNCTION create_direct_message_notification() IS 'Creates notifications for direct messages between users, with smart club context detection for URL generation'; 