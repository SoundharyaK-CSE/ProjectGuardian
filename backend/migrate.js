const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function migrate() {
    try {
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'ZIP'`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS repository_url TEXT`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS repository_branch VARCHAR(100)`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS requirement_analysis JSONB`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS impact_analysis JSONB`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS implementation_plan JSONB`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS developer_decision JSONB`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS ai_update_result JSONB`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS guide_me_progress JSONB`);
        await db.query(`ALTER TABLE analysis ADD COLUMN IF NOT EXISTS validation_result JSONB`);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
