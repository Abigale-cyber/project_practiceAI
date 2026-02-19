import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Search, Calendar, CheckCircle2, Loader2, FileUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { knowledgeApi } from '../../api';

interface Document {
  id: number;
  name: string;
  file_type: string;
  file_size: string;
  status: string;
  created_at: string;
  category?: string;
  chunk_count?: number;
}

const CHUNK_METHODS = [
  { id: 'auto', label: '📄 自动段落', desc: '按自然段落自动分割，适合大多数文档' },
  { id: 'heading1', label: '📑 按标题分章', desc: '按一级标题(#)拆分，适合结构清晰的教材' },
  { id: 'heading2', label: '📋 按小节分段', desc: '按二级标题(##)拆分，精细检索' },
  { id: 'qa', label: '❓ 问答对', desc: '按 Q&A 对自动识别，适合FAQ文档' },
  { id: 'page', label: '📝 逐页分割', desc: '每页为一个知识块，适合PDF/PPT' },
];

export default function AdminKnowledge() {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [chunkMethod, setChunkMethod] = useState('auto');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docs, s] = await Promise.all([
        knowledgeApi.listDocuments(),
        knowledgeApi.getStats(),
      ]);
      setDocuments(docs);
      setStats(s);
    } catch (err: any) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setSelectedFiles(Array.from(files));
    setShowUploadPanel(true);
    // reset input
    event.target.value = '';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        await knowledgeApi.uploadDocument(file, chunkMethod);
        toast.success(`文档 "${file.name}" 上传成功`);
      }
      setSelectedFiles([]);
      setShowUploadPanel(false);
      setChunkMethod('auto');
      loadData();
    } catch (err: any) {
      toast.error(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setSelectedFiles([]);
    setShowUploadPanel(false);
    setChunkMethod('auto');
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      await knowledgeApi.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success(`已删除文档 "${name}"`);
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMethod = CHUNK_METHODS.find(m => m.id === chunkMethod)!;

  return (
    <div className="size-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl mb-1 text-foreground">知识管理</h1>
            <p className="text-sm text-muted-foreground">上传和管理课程文档</p>
          </div>
          <label className={`inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer text-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? '上传中...' : '上传文档'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {/* Upload Panel - 选择分块方式 */}
        {showUploadPanel && (
          <div className="bg-card rounded-xl shadow-sm border border-border mb-6 overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <FileUp className="size-5 text-primary" />
                <h3 className="font-semibold text-foreground">上传设置</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                已选择 {selectedFiles.length} 个文件：{selectedFiles.map(f => f.name).join(', ')}
              </p>
            </div>

            <div className="p-5">
              <label className="block font-medium text-sm text-foreground mb-3">选择分块方式</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {CHUNK_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setChunkMethod(method.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${chunkMethod === method.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-muted-foreground'
                      }`}
                  >
                    <div className="font-medium text-sm mb-1 text-foreground">{method.label}</div>
                    <div className="text-xs text-muted-foreground">{method.desc}</div>
                    {method.id === 'auto' && chunkMethod === 'auto' && (
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">推荐</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {uploading ? '上传处理中...' : `确认上传（${selectedMethod.label}）`}
                </button>
                <button
                  onClick={cancelUpload}
                  disabled={uploading}
                  className="px-6 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文档..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-input-background text-foreground"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="text-2xl mb-1 text-foreground">{loading ? '...' : stats?.total_documents ?? 0}</div>
            <div className="text-sm text-muted-foreground">总文档数</div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="text-2xl text-success mb-1">{loading ? '...' : stats?.processed_documents ?? 0}</div>
            <div className="text-sm text-muted-foreground">已处理</div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="text-2xl text-muted-foreground mb-1">{loading ? '...' : stats?.processing_count ?? 0}</div>
            <div className="text-sm text-muted-foreground">处理中</div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="text-2xl mb-1 text-foreground">{loading ? '...' : stats?.total_chunks ?? 0}</div>
            <div className="text-sm text-muted-foreground">总切片数</div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-medium text-foreground">文档列表</h2>
          </div>
          <div className="divide-y divide-border">
            {!loading && filteredDocuments.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">暂无文档</div>
            )}
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-5 hover:bg-muted transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="size-5 text-muted-foreground flex-none" />
                      <h3 className="font-medium truncate text-foreground">{doc.name}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="px-2 py-0.5 bg-muted rounded text-xs">{doc.file_type || 'file'}</span>
                      <span>{doc.file_size || '未知'}</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="size-4" />
                        {doc.created_at}
                      </div>
                      {doc.chunk_count && doc.chunk_count > 0 && (
                        <span className="text-xs">{doc.chunk_count} 个切片</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.status === 'processed' ? (
                      <span className="px-2 py-1 bg-success/10 text-success rounded text-xs">
                        <CheckCircle2 className="size-3 inline mr-1" />
                        已处理
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                        <Loader2 className="size-3 inline mr-1 animate-spin" />
                        处理中
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id, doc.name)}
                      className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}