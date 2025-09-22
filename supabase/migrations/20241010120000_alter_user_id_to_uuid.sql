-- Migration to change user_id from text to uuid in chat_conversations table

-- Step 1: Drop NOT NULL constraint
ALTER TABLE public.chat_conversations
ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Set existing user_id to NULL (since 'demo-user' can't be cast to uuid)
UPDATE public.chat_conversations
SET user_id = NULL;

-- Step 3: Change column type to uuid
ALTER TABLE public.chat_conversations
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Step 4: Restore NOT NULL constraint
ALTER TABLE public.chat_conversations
ALTER COLUMN user_id SET NOT NULL;