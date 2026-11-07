-- Set live chat URL (th6688 /api/index/index service_url)
-- Run in Supabase SQL Editor; admin can change site_settings.service_url later

UPDATE site_settings
SET service_url = 'https://msg.btmsgx8.cc?groupId=yPRWmsRhS6&appId=JGxCRUtI'
WHERE id = 1;
