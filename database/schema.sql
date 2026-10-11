CREATE TABLE IF NOT EXISTS analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    existing_requirement TEXT,
    new_requirement TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    workflow_step VARCHAR(100) NOT NULL,
    scan_data JSONB,
    source_type VARCHAR(20) DEFAULT 'ZIP',
    repository_url TEXT,
    repository_branch VARCHAR(100)
);
