CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 知识库文档表
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size VARCHAR(50),
    category VARCHAR(100) DEFAULT '未分类',
    status VARCHAR(20) DEFAULT 'processing',
    chunk_count INTEGER DEFAULT 0,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_uploaded_by ON knowledge_documents(uploaded_by);

-- 手工题库表
CREATE TABLE IF NOT EXISTS static_questions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    question TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT,
    explanation TEXT,
    category VARCHAR(100) DEFAULT '未分类',
    difficulty VARCHAR(20) DEFAULT 'medium',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_static_questions_category ON static_questions(category);
CREATE INDEX IF NOT EXISTS idx_static_questions_type ON static_questions(type);

-- 题目集表
CREATE TABLE IF NOT EXISTS question_sets (
    id SERIAL PRIMARY KEY,
    topic_name VARCHAR(255) NOT NULL,
    knowledge_base_id VARCHAR(100),
    knowledge_base_name VARCHAR(255),
    question_count INTEGER DEFAULT 3,
    question_types JSONB DEFAULT '["choice"]',
    difficulty VARCHAR(20) DEFAULT 'medium',
    focus JSONB DEFAULT '[]',
    custom_instruction TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'draft',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 新的动态生成题目表
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES question_sets(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    options JSONB,
    answer TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 练习记录表
CREATE TABLE IF NOT EXISTS practice_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    knowledge_base VARCHAR(100),
    question_type VARCHAR(20) DEFAULT 'all',
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);

-- 答题记录表
CREATE TABLE IF NOT EXISTS practice_answers (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES practice_sessions(id) ON DELETE CASCADE,
    question_id INTEGER,
    user_answer TEXT,
    is_correct BOOLEAN,
    ai_feedback TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_practice_answers_session_id ON practice_answers(session_id);

-- 问答会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(16) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) DEFAULT '新会话',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- 问答消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(16) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    citations JSONB,
    suggested_questions JSONB,
    attached_docs JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- 练习配置表
CREATE TABLE IF NOT EXISTS practice_settings (
    id SERIAL PRIMARY KEY,
    quiz_topics JSONB DEFAULT '[]',
    question_count INTEGER DEFAULT 5,
    question_types JSONB DEFAULT '["choice", "essay"]',
    quiz_difficulty VARCHAR(20) DEFAULT 'medium',
    quiz_focus JSONB DEFAULT '["concept", "compare", "apply", "process"]',
    quiz_custom_instruction TEXT DEFAULT '',
    grading_strictness VARCHAR(20) DEFAULT 'medium',
    grading_style VARCHAR(20) DEFAULT 'encouraging',
    passing_score INTEGER DEFAULT 60,
    show_answer BOOLEAN DEFAULT true,
    grading_custom_instruction TEXT DEFAULT '',
    time_limit INTEGER DEFAULT 0,
    question_source VARCHAR(20) DEFAULT 'ai_generated',
    knowledge_base VARCHAR(50) DEFAULT 'all',
    difficulty VARCHAR(20) DEFAULT 'all',
    random_order BOOLEAN DEFAULT true,
    show_explanation BOOLEAN DEFAULT true,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO practice_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 插入默认管理员
INSERT INTO users (username, password_hash, role) VALUES (
    'admin',
    '$2b$12$KvfjGY0b5dQaVlR3F8raOu3ooYv45FBFCG2v4786GX5RhZwX8B1k2',
    'admin'
) ON CONFLICT DO NOTHING;
