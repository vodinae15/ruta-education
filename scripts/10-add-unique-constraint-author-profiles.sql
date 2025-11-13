-- Add unique constraint on user_id to enable upsert functionality
ALTER TABLE author_profiles 
ADD CONSTRAINT author_profiles_user_id_unique UNIQUE (user_id);
