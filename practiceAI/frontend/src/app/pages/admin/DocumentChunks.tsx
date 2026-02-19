import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, FileText, Hash, CheckCircle2, XCircle, Search, Copy, Check, Pencil, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { knowledgeApi } from '../../api';

interface ChunkData {
    id: number;
    chunk_index: number;
    content: string;
    has_embedding: boolean;
    content_length: number;
}

interface DocumentData {
    id: number;
    name: string;
    file_type: string;
    file_size: string;
    status: string;
    chunk_count: number;
    created_at: string;
}

export default function DocumentChunks() {
    const { documentId } = useParams<{ documentId: string }>();
    const navigate = useNavigate();
    const [document, setDocument] = useState<DocumentData | null>(null);
    const [chunks, setChunks] = useState<ChunkData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedChunk, setExpandedChunk] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // 编辑状态
    const [editingChunkId, setEditingChunkId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [documentId]);

    const loadData = async () => {
        if (!documentId) return;
        try {
            setLoading(true);
            const data = await knowledgeApi.getDocumentChunks(Number(documentId));
            setDocument(data.document);
            setChunks(data.chunks);
        } catch (err: any) {
            toast.error(err.message || '加载分块数据失败');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async (content: string, chunkId: number) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedId(chunkId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error('复制失败');
        }
    };

    const startEditing = (chunk: ChunkData) => {
        setEditingChunkId(chunk.id);
        setEditContent(chunk.content);
        setExpandedChunk(chunk.id); // 自动展开
    };

    const cancelEditing = () => {
        setEditingChunkId(null);
        setEditContent('');
    };

    const handleSave = async (chunkId: number) => {
        if (!editContent.trim()) {
            toast.error('内容不能为空');
            return;
        }
        try {
            setSaving(true);
            const updated = await knowledgeApi.updateChunk(chunkId, editContent.trim());
            // 更新本地状态
            setChunks((prev) =>
                prev.map((c) =>
                    c.id === chunkId
                        ? { ...c, content: updated.content, content_length: updated.content_length, has_embedding: updated.has_embedding }
                        : c
                )
            );
            setEditingChunkId(null);
            setEditContent('');
            toast.success('分块内容已更新，Embedding 已重新生成');
        } catch (err: any) {
            toast.error(err.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    const filteredChunks = chunks.filter((chunk) =>
        chunk.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalChars = chunks.reduce((sum, c) => sum + c.content_length, 0);
    const embeddedCount = chunks.filter((c) => c.has_embedding).length;

    if (loading) {
        return (
            <div className="size-full flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">加载分块数据...</p>
                </div>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="size-full flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">文档不存在</p>
                    <button
                        onClick={() => navigate('/admin/knowledge')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                    >
                        返回知识管理
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="size-full overflow-auto bg-background">
            <div className="max-w-5xl mx-auto p-6 md:p-8">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/admin/knowledge')}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="size-4" />
                        返回知识管理
                    </button>
                    <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center flex-none">
                            <FileText className="size-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-medium text-foreground truncate">{document.name}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                <span className="px-2 py-0.5 bg-muted rounded text-xs">{document.file_type}</span>
                                <span>{document.file_size}</span>
                                <span>{document.created_at}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-card rounded-lg border border-border p-4">
                        <div className="text-2xl font-medium text-foreground">{chunks.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">总分块数</div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                        <div className="text-2xl font-medium text-success">{embeddedCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">已向量化</div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                        <div className="text-2xl font-medium text-foreground">{totalChars.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground mt-1">总字符数</div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                        <div className="text-2xl font-medium text-foreground">
                            {chunks.length > 0 ? Math.round(totalChars / chunks.length) : 0}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">平均字符数</div>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="搜索分块内容..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    {searchQuery && (
                        <div className="mt-2 text-xs text-muted-foreground">
                            找到 {filteredChunks.length} / {chunks.length} 个分块
                        </div>
                    )}
                </div>

                {/* Chunks List */}
                <div className="space-y-3">
                    {filteredChunks.map((chunk) => {
                        const isExpanded = expandedChunk === chunk.id;
                        const isEditing = editingChunkId === chunk.id;
                        const previewText =
                            chunk.content.length > 200 && !isExpanded && !isEditing
                                ? chunk.content.slice(0, 200) + '...'
                                : chunk.content;

                        return (
                            <div
                                key={chunk.id}
                                className={`bg-card rounded-lg border overflow-hidden transition-colors ${isEditing ? 'border-primary shadow-sm' : 'border-border hover:border-primary/30'
                                    }`}
                            >
                                {/* Chunk Header */}
                                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                            <Hash className="size-3" />
                                            {chunk.chunk_index + 1}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {isEditing ? editContent.length : chunk.content_length} 字符
                                        </span>
                                        {chunk.has_embedding ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-success">
                                                <CheckCircle2 className="size-3" />
                                                已向量化
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <XCircle className="size-3" />
                                                未向量化
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={cancelEditing}
                                                    disabled={saving}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                                                >
                                                    <X className="size-3" />
                                                    取消
                                                </button>
                                                <button
                                                    onClick={() => handleSave(chunk.id)}
                                                    disabled={saving}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {saving ? (
                                                        <Loader2 className="size-3 animate-spin" />
                                                    ) : (
                                                        <Save className="size-3" />
                                                    )}
                                                    {saving ? '保存中...' : '保存'}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => startEditing(chunk)}
                                                    className="p-1.5 text-muted-foreground hover:text-primary rounded transition-colors"
                                                    title="编辑内容"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleCopy(chunk.content, chunk.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                                                    title="复制内容"
                                                >
                                                    {copiedId === chunk.id ? (
                                                        <Check className="size-3.5 text-success" />
                                                    ) : (
                                                        <Copy className="size-3.5" />
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Chunk Content */}
                                {isEditing ? (
                                    <div className="p-3">
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full min-h-[200px] p-3 border border-border rounded-lg bg-input-background text-sm text-foreground leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            autoFocus
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            💡 保存后将自动重新生成 Embedding 向量
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className="px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap cursor-pointer"
                                            onClick={() => setExpandedChunk(isExpanded ? null : chunk.id)}
                                        >
                                            {previewText}
                                        </div>
                                        {chunk.content.length > 200 && (
                                            <div className="px-4 pb-2">
                                                <button
                                                    onClick={() => setExpandedChunk(isExpanded ? null : chunk.id)}
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    {isExpanded ? '收起' : '展开全部内容'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filteredChunks.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        {searchQuery ? '没有找到匹配的分块' : '该文档暂无分块数据'}
                    </div>
                )}
            </div>
        </div>
    );
}
