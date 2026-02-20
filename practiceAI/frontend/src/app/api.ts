// ===== API 配置 =====
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ===== Token 管理 =====
export function getToken(): string | null {
    return localStorage.getItem('practiceai_token');
}

export function setToken(token: string) {
    localStorage.setItem('practiceai_token', token);
}

export function removeToken() {
    localStorage.removeItem('practiceai_token');
}

export function isLoggedIn(): boolean {
    return !!getToken();
}

// ===== 请求工具 =====
async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    // TODO: 恢复 JWT 后取消注释
    // if (res.status === 401) {
    //     removeToken();
    //     window.location.href = '/';
    //     throw new Error('登录已过期');
    // }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || '请求失败');
    }

    return res.json();
}

async function requestUpload<T = any>(path: string, formData: FormData): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || '上传失败');
    }

    return res.json();
}

// ===== 认证 API =====
export const authApi = {
    login: (username: string, password: string) =>
        request<{ access_token: string; token_type: string }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    register: (username: string, password: string) =>
        request<{ message: string }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),
};

// ===== 题库 API（已废弃——现在由 AI 自动出题） =====

// ===== 练习配置 API =====
export const settingsApi = {
    get: () => request('/api/admin/settings/'),
    update: (data: Record<string, any>) =>
        request('/api/admin/settings/', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};

// ===== 知识库 API =====
export const knowledgeApi = {
    listDocuments: () => request<any[]>('/api/admin/knowledge/documents'),

    uploadDocument: (file: File, chunkMethod: string = 'auto') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chunk_method', chunkMethod);
        return requestUpload('/api/admin/knowledge/documents/upload', formData);
    },

    deleteDocument: (id: number) =>
        request(`/api/admin/knowledge/documents/${id}`, { method: 'DELETE' }),

    getStats: () => request('/api/admin/knowledge/stats'),

    getDocumentChunks: (documentId: number) =>
        request<any>(`/api/admin/knowledge/documents/${documentId}/chunks`),

    updateChunk: (chunkId: number, content: string) =>
        request<any>(`/api/admin/knowledge/chunks/${chunkId}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        }),
};

// ===== 题目集 API =====
export const questionSetApi = {
    listSets: () => request<any[]>('/api/admin/questions/sets'),

    createSet: (data: any) =>
        request<any>('/api/admin/questions/sets', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getSet: (setId: number) => request<any>(`/api/admin/questions/sets/${setId}`),

    updateSet: (setId: number, data: any) =>
        request<any>(`/api/admin/questions/sets/${setId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteSet: (setId: number) =>
        request(`/api/admin/questions/sets/${setId}`, { method: 'DELETE' }),

    regenerate: (setId: number) =>
        request<any>(`/api/admin/questions/sets/${setId}/regenerate`, { method: 'POST' }),

    addQuestion: (setId: number, data: any) =>
        request<any>(`/api/admin/questions/sets/${setId}/questions`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateQuestion: (questionId: number, data: any) =>
        request<any>(`/api/admin/questions/questions/${questionId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteQuestion: (questionId: number) =>
        request(`/api/admin/questions/questions/${questionId}`, { method: 'DELETE' }),
};

// ===== 练习 API =====
export const practiceApi = {
    getKnowledgeBases: () =>
        request<{ id: string; name: string }[]>('/api/practice/knowledge-bases'),

    getQuestionSets: () =>
        request<any[]>('/api/practice/question-sets'),

    startFromSet: (setId: number) =>
        request<any>(`/api/practice/sessions/from-set/${setId}`, { method: 'POST' }),

    startSession: (data: {
        knowledge_base?: string;
        question_type?: string;
        question_count?: number;
    }) =>
        request('/api/practice/sessions', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    submitAnswer: (sessionId: number, data: { question_id: number; user_answer: string }) =>
        request(`/api/practice/sessions/${sessionId}/submit`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    finishSession: (sessionId: number, duration: number) =>
        request(`/api/practice/sessions/${sessionId}/finish?duration=${duration}`, {
            method: 'POST',
        }),

    getResult: (sessionId: number) =>
        request(`/api/practice/sessions/${sessionId}/result`),
};

// ===== 问答 API =====
export const chatApi = {
    createSession: () =>
        request<{ session_id: string }>('/api/chat/sessions', { method: 'POST' }),

    listSessions: () => request<any[]>('/api/chat/sessions'),

    getMessages: (sessionId: string) =>
        request<any[]>(`/api/chat/sessions/${sessionId}/messages`),

    renameSession: (sessionId: string, title: string) =>
        request(`/api/chat/sessions/${sessionId}/title`, {
            method: 'PUT',
            body: JSON.stringify({ title }),
        }),

    deleteSession: (sessionId: string) =>
        request(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' }),

    parseFile: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return requestUpload<{ filename: string; text: string; char_count: number }>('/api/chat/parse-file', formData);
    },

    sendMessage: async function* (sessionId: string, message: string, documentIds?: number[], signal?: AbortSignal, fileContext?: string, attachedDocs?: string[]) {
        const token = getToken();
        const body: any = { message };
        if (documentIds && documentIds.length > 0) {
            body.document_ids = documentIds;
        }
        if (fileContext) {
            body.file_context = fileContext;
        }
        if (attachedDocs && attachedDocs.length > 0) {
            body.attached_docs = attachedDocs;
        }
        const res = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!res.ok) throw new Error('发送消息失败');

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            yield data;
                        } catch {
                            // ignore parse errors
                        }
                    }
                }
            }
        } catch (streamError: any) {
            // 重新包装流错误，防止 browser 内部 Error（含循环引用）透传到上层
            const msg = typeof streamError?.message === 'string' ? streamError.message : '流读取失败';
            if (streamError?.name === 'AbortError') {
                const abortErr = new Error('AbortError');
                abortErr.name = 'AbortError';
                throw abortErr;
            }
            throw new Error(String(msg));
        }
    },
};

// ===== 历史 API =====
export const historyApi = {
    getPracticeHistory: () => request<any[]>('/api/history/practice'),
    getPracticeDetail: (sessionId: number) => request(`/api/history/practice/${sessionId}`),
    getChatHistory: () => request<any[]>('/api/history/chat'),
    getStudentStats: () => request('/api/history/stats'),
};

// ===== 管理概览 API =====
export const adminApi = {
    getDashboardStats: () => request('/api/admin/dashboard/stats'),
    getRecentActivities: (limit?: number) =>
        request(`/api/admin/dashboard/recent-activities${limit ? `?limit=${limit}` : ''}`),
    getPopularQuestions: (limit?: number) =>
        request(`/api/admin/dashboard/popular-questions${limit ? `?limit=${limit}` : ''}`),
};
