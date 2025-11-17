-- ============================================================================
-- GATI Vercel Backend Database Queries
-- ============================================================================
-- Use these queries in your Supabase SQL Editor or database client
-- to verify that auth and metrics are working correctly
-- ============================================================================

-- ============================================================================
-- 1. CHECK AUTHENTICATION
-- ============================================================================

-- List all authenticated users
SELECT
    email,
    created_at,
    last_active,
    LENGTH(api_token) as token_length
FROM gati_users
ORDER BY created_at DESC;

-- Check if specific email exists
SELECT * FROM gati_users
WHERE email = 'your-email@example.com';

-- Count total authenticated users
SELECT COUNT(*) as total_users FROM gati_users;


-- ============================================================================
-- 2. CHECK VERIFICATION CODES
-- ============================================================================

-- View recent verification codes (useful for debugging)
SELECT
    email,
    verified,
    attempts,
    expires_at,
    created_at,
    CASE
        WHEN expires_at > NOW() THEN 'VALID'
        ELSE 'EXPIRED'
    END as status
FROM gati_verification_codes
ORDER BY created_at DESC
LIMIT 20;

-- Check specific email's verification status
SELECT * FROM gati_verification_codes
WHERE email = 'your-email@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Count verification attempts by email
SELECT
    email,
    COUNT(*) as total_attempts,
    MAX(verified) as ever_verified,
    MAX(created_at) as last_attempt
FROM gati_verification_codes
GROUP BY email
ORDER BY last_attempt DESC;


-- ============================================================================
-- 3. CHECK METRICS DATA
-- ============================================================================

-- View all metrics sent to backend
SELECT
    installation_id,
    sdk_version,
    user_email,
    agents_tracked,
    events_today,
    lifetime_events,
    mcp_queries,
    frameworks_detected,
    timestamp,
    received_at
FROM gati_metrics
ORDER BY received_at DESC
LIMIT 50;

-- Check metrics for specific email
SELECT * FROM gati_metrics
WHERE user_email = 'your-email@example.com'
ORDER BY received_at DESC;

-- Check metrics for specific installation ID
SELECT * FROM gati_metrics
WHERE installation_id = 'your-installation-uuid'
ORDER BY received_at DESC;

-- Get latest metrics for each user
SELECT DISTINCT ON (user_email)
    user_email,
    installation_id,
    sdk_version,
    lifetime_events,
    frameworks_detected,
    received_at
FROM gati_metrics
ORDER BY user_email, received_at DESC;

-- Count total metrics submissions
SELECT COUNT(*) as total_submissions FROM gati_metrics;

-- Count metrics by user
SELECT
    user_email,
    COUNT(*) as submissions,
    MAX(received_at) as last_submission
FROM gati_metrics
GROUP BY user_email
ORDER BY submissions DESC;


-- ============================================================================
-- 4. VERIFY END-TO-END FLOW
-- ============================================================================

-- Check if user has both auth and metrics
-- (This joins users with their metrics)
SELECT
    u.email,
    u.created_at as user_created,
    COUNT(m.installation_id) as metric_submissions,
    MAX(m.received_at) as last_metric_received,
    ARRAY_AGG(DISTINCT m.installation_id) as installation_ids
FROM gati_users u
LEFT JOIN gati_metrics m ON u.email = m.user_email
GROUP BY u.email, u.created_at
ORDER BY u.created_at DESC;

-- Find users who authenticated but never sent metrics
SELECT
    u.email,
    u.created_at
FROM gati_users u
LEFT JOIN gati_metrics m ON u.email = m.user_email
WHERE m.installation_id IS NULL
ORDER BY u.created_at DESC;

-- Find metrics without matching user (shouldn't happen)
SELECT
    m.user_email,
    m.installation_id,
    m.received_at
FROM gati_metrics m
LEFT JOIN gati_users u ON m.user_email = u.email
WHERE u.email IS NULL;


-- ============================================================================
-- 5. AGGREGATE STATISTICS
-- ============================================================================

-- Total usage statistics
SELECT
    COUNT(DISTINCT user_email) as unique_users,
    COUNT(DISTINCT installation_id) as unique_installations,
    SUM(lifetime_events) as total_events_tracked,
    SUM(agents_tracked) as total_agents,
    SUM(mcp_queries) as total_mcp_queries
FROM gati_metrics;

-- Framework usage breakdown
SELECT
    framework,
    COUNT(*) as usage_count
FROM gati_metrics,
LATERAL jsonb_array_elements_text(frameworks_detected::jsonb) as framework
GROUP BY framework
ORDER BY usage_count DESC;

-- SDK version distribution
SELECT
    sdk_version,
    COUNT(DISTINCT user_email) as users,
    COUNT(*) as submissions
FROM gati_metrics
GROUP BY sdk_version
ORDER BY users DESC;

-- Metrics over time (daily aggregation)
SELECT
    DATE(received_at) as date,
    COUNT(*) as submissions,
    COUNT(DISTINCT user_email) as unique_users
FROM gati_metrics
GROUP BY DATE(received_at)
ORDER BY date DESC;


-- ============================================================================
-- 6. DEBUGGING QUERIES
-- ============================================================================

-- Check for duplicate installation IDs
SELECT
    installation_id,
    COUNT(DISTINCT user_email) as user_count,
    ARRAY_AGG(DISTINCT user_email) as emails
FROM gati_metrics
GROUP BY installation_id
HAVING COUNT(DISTINCT user_email) > 1;

-- Find metrics submitted today
SELECT * FROM gati_metrics
WHERE DATE(received_at) = CURRENT_DATE
ORDER BY received_at DESC;

-- Check for expired verification codes that weren't verified
SELECT
    email,
    expires_at,
    created_at,
    verified,
    attempts
FROM gati_verification_codes
WHERE expires_at < NOW() AND verified = false
ORDER BY created_at DESC
LIMIT 20;

-- Check rate of successful vs failed verifications
SELECT
    verified,
    COUNT(*) as count
FROM gati_verification_codes
GROUP BY verified;


-- ============================================================================
-- 7. CLEANUP QUERIES (Use with caution!)
-- ============================================================================

-- Delete expired verification codes (safe to run periodically)
DELETE FROM gati_verification_codes
WHERE expires_at < NOW() - INTERVAL '1 day';

-- Delete old verification codes (keep only last 30 days)
DELETE FROM gati_verification_codes
WHERE created_at < NOW() - INTERVAL '30 days';


-- ============================================================================
-- 8. TEST DATA VERIFICATION
-- ============================================================================

-- After running test_auth_and_metrics.py or test_metrics_only.py,
-- use these queries to verify:

-- 1. Check your email was added to users
SELECT * FROM gati_users
WHERE email = 'YOUR_TEST_EMAIL@example.com';

-- 2. Check metrics were received (use the installation_id from test output)
SELECT * FROM gati_metrics
WHERE installation_id = 'YOUR_INSTALLATION_UUID'
ORDER BY received_at DESC;

-- 3. Verify metrics are linked to your email
SELECT
    m.*
FROM gati_metrics m
JOIN gati_users u ON m.user_email = u.email
WHERE u.email = 'YOUR_TEST_EMAIL@example.com'
ORDER BY m.received_at DESC;

-- 4. Get the full picture for your test user
SELECT
    'User' as type,
    email as identifier,
    created_at as timestamp,
    NULL as extra
FROM gati_users
WHERE email = 'YOUR_TEST_EMAIL@example.com'

UNION ALL

SELECT
    'Verification' as type,
    email as identifier,
    created_at as timestamp,
    CASE WHEN verified THEN 'Verified' ELSE 'Not Verified' END as extra
FROM gati_verification_codes
WHERE email = 'YOUR_TEST_EMAIL@example.com'

UNION ALL

SELECT
    'Metrics' as type,
    installation_id as identifier,
    received_at as timestamp,
    'Events: ' || lifetime_events::text as extra
FROM gati_metrics
WHERE user_email = 'YOUR_TEST_EMAIL@example.com'

ORDER BY timestamp DESC;
