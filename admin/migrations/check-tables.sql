SELECT 'admin_ip_whitelist' AS tbl, COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema='zero' AND table_name='admin_ip_whitelist'
UNION ALL
SELECT 'retired_invite_codes', COUNT(*) FROM information_schema.tables WHERE table_schema='zero' AND table_name='retired_invite_codes';
