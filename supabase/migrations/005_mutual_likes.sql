-- Prevent duplicate say_hi from same sender to same receiver
-- Keep earliest row if duplicates exist
DELETE FROM interactions a USING interactions b
WHERE a.sender_id = b.sender_id
  AND a.receiver_id = b.receiver_id
  AND a.type = b.type
  AND a.created_at > b.created_at;

ALTER TABLE interactions
  ADD CONSTRAINT unique_interaction_per_pair UNIQUE (sender_id, receiver_id, type);
