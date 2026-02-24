import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Upload, FileText, Trash2, Search, Calendar, CheckCircle2, Loader2, FileUp, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { knowledgeApi } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';

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
  { id: 'auto', label: '📄 自 动 段 落', desc: '按自然段落自动分割' },
  { id: 'heading1', label: '📑 按 标 题 分 章', desc: '按一级标题(#)拆分' },
  { id: 'heading2', label: '📋 按 小 节 分 段', desc: '按二级标题(##)拆分' },
  { id: 'qa', label: '❓ 问 答 对', desc: '按 Q&A 对自动识别' },
  { id: 'page', label: '📝 逐 页 分 割', desc: '每页为一个知识块' },
];

export default function AdminKnowledge() {
  const navigate = useNavigate();
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

  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const handleDelete = async (id: number, name: string) => {
    setConfirmDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await knowledgeApi.deleteDocument(confirmDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== confirmDelete.id));
      toast.success(`已删除文档 "${confirmDelete.name}"`);
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    } finally {
      setConfirmDelete(null);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMethod = CHUNK_METHODS.find(m => m.id === chunkMethod)!;

  return (
    <div className="size-full overflow-auto bg-[#FFFDF5]">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-black font-[Syne] tracking-tighter text-slate-900 leading-none mb-1 md:mb-2 hover:-skew-x-2 transition-transform duration-500 cursor-default">
              知 识 <br /><span className="text-[#2563EB] text-outline">管 理</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <label className={`inline-flex items-center gap-2 px-6 py-3 bg-[#FDE047] text-black border-2 md:border-4 border-black rounded-xl md:rounded-2xl neo-shadow-sm hover:neo-shadow hover:-translate-y-1 transition-all cursor-pointer text-sm md:text-lg font-black uppercase tracking-widest ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? <Loader2 className="size-5 animate-spin" strokeWidth={3} /> : <Upload className="size-5" strokeWidth={3} />}
              {uploading ? '上 传 中...' : '上 传 文 档'}
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
        </div>

        {/* Upload Panel - 选择分块方式 */}
        {showUploadPanel && (
          <div className="bg-white rounded-3xl border-4 border-black neo-shadow-sm mb-12 overflow-hidden">
            <div className="p-6 border-b-4 border-black bg-[#2563EB]">
              <div className="flex items-center gap-3 mb-2">
                <FileUp className="size-8 text-white" strokeWidth={3} />
                <h3 className="text-2xl font-black text-white tracking-widest">上 传 设 置</h3>
              </div>
              <p className="text-base font-bold text-white/90">
                已选择 {selectedFiles.length} 个文件：{selectedFiles.map(f => f.name).join(', ')}
              </p>
            </div>

            <div className="p-8">
              <label className="block text-xl font-black text-black mb-6 tracking-widest">选 择 分 块 方 式</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {CHUNK_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setChunkMethod(method.id)}
                    className={`p-6 rounded-2xl border-4 transition-all text-left group ${chunkMethod === method.id
                      ? 'border-black bg-[#FDE047] neo-shadow-sm'
                      : 'border-black bg-white hover:bg-black/5'
                      }`}
                  >
                    <div className="text-xl font-black mb-2 text-black tracking-widest">{method.label}</div>
                    <div className="text-sm font-bold text-slate-600">{method.desc}</div>
                    {method.id === 'auto' && chunkMethod === 'auto' && (
                      <span className="inline-block mt-4 text-xs px-3 py-1 bg-black text-white rounded-full font-black tracking-widest uppercase">推荐</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-8 py-4 bg-[#2563EB] text-white border-4 border-black font-black text-xl tracking-widest rounded-2xl neo-shadow-sm hover:neo-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="size-6 animate-spin" strokeWidth={3} /> : <Upload className="size-6" strokeWidth={3} />}
                  {uploading ? '上 传 处理 中...' : `确 认 上 传（${selectedMethod.label}）`}
                </button>
                <button
                  onClick={cancelUpload}
                  disabled={uploading}
                  className="px-8 py-4 bg-white text-black border-4 border-black font-black text-xl tracking-widest rounded-2xl hover:bg-black/5 transition-all"
                >
                  取 消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-xl md:rounded-2xl border-2 md:border-4 border-black p-3 md:p-4 mb-8 neo-shadow-sm flex items-center">
          <Search className="size-5 md:size-6 text-slate-500 ml-2 border-r-2 border-slate-300 pr-2" strokeWidth={3} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜 索 文 档..."
            className="w-full pl-3 md:pl-4 py-1.5 md:py-2 bg-transparent focus:outline-none text-base md:text-xl font-black text-black placeholder:text-slate-400 placeholder:font-black tracking-widest"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
          <div className="bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black p-4 md:p-6 neo-shadow-sm hover:-translate-y-1 hover:neo-shadow transition-all group flex flex-col justify-between">
            <div className="text-3xl md:text-5xl font-black mb-1 md:mb-2 group-hover:scale-110 origin-left transition-transform leading-none">{loading ? '...' : stats?.total_documents ?? 0}</div>
            <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500">总 文 档 数</div>
          </div>
          <div className="bg-[#FDE047] rounded-2xl md:rounded-3xl border-2 md:border-4 border-black p-4 md:p-6 neo-shadow-sm hover:-translate-y-1 hover:neo-shadow transition-all group flex flex-col justify-between">
            <div className="text-3xl md:text-5xl font-black text-black mb-1 md:mb-2 group-hover:scale-110 origin-left transition-transform leading-none">{loading ? '...' : stats?.processed_documents ?? 0}</div>
            <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black">已 处 理</div>
          </div>
          <div className="bg-slate-200 rounded-2xl md:rounded-3xl border-2 md:border-4 border-black p-4 md:p-6 neo-shadow-sm hover:-translate-y-1 hover:neo-shadow transition-all group flex flex-col justify-between">
            <div className="text-3xl md:text-5xl font-black text-black mb-1 md:mb-2 group-hover:scale-110 origin-left transition-transform leading-none">{loading ? '...' : stats?.processing_count ?? 0}</div>
            <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600">处 理 中</div>
          </div>
          <div className="bg-[#F9A8D4] rounded-2xl md:rounded-3xl border-2 md:border-4 border-black p-4 md:p-6 neo-shadow-sm hover:-translate-y-1 hover:neo-shadow transition-all group flex flex-col justify-between">
            <div className="text-3xl md:text-5xl font-black text-black mb-1 md:mb-2 group-hover:scale-110 origin-left transition-transform leading-none">{loading ? '...' : stats?.total_chunks ?? 0}</div>
            <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black">总 切 片 数</div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black neo-shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b-2 md:border-b-4 border-black bg-[#2563EB]">
            <h2 className="text-lg md:text-2xl font-black text-white tracking-widest">文 档 列 表</h2>
          </div>
          <div className="divide-y-2 md:divide-y-4 divide-black flex-1">
            {!loading && filteredDocuments.length === 0 && (
              <div className="p-8 md:p-12 text-center text-slate-500 text-xs md:text-sm font-black tracking-widest font-mono">
                [ 暂 无 文 档 ]
              </div>
            )}
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-4 md:p-6 hover:bg-black/5 transition-colors group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
                      <div className="size-10 md:size-12 rounded-xl border-2 md:border-4 border-black bg-[#FDE047] flex items-center justify-center neo-shadow-sm group-hover:scale-110 transition-transform hidden md:flex">
                        <FileText className="size-5 md:size-6 text-black" strokeWidth={3} />
                      </div>
                      <h3
                        className="text-lg md:text-xl font-black truncate text-black hover:text-[#2563EB] cursor-pointer transition-colors leading-tight"
                        onClick={() => navigate(`/admin/knowledge/${doc.id}/chunks`)}
                      >
                        {doc.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm font-bold text-slate-500">
                      <span className="px-2 md:px-3 py-0.5 md:py-1 bg-white border md:border-2 border-black rounded-full font-black text-black tracking-widest uppercase">{doc.file_type || 'FILE'}</span>
                      <span className="font-mono">{doc.file_size || 'UNKNOWN'}</span>
                      <div className="flex items-center gap-1 md:gap-2 font-mono">
                        <Calendar className="size-3 md:size-4" strokeWidth={3} />
                        {doc.created_at?.slice(0, 10)}
                      </div>
                      {doc.chunk_count != null && doc.chunk_count > 0 && (
                        <button
                          onClick={() => navigate(`/admin/knowledge/${doc.id}/chunks`)}
                          className="inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 py-0.5 md:py-1 bg-black text-white border md:border-2 border-black rounded-full font-black tracking-widest hover:bg-[#F9A8D4] hover:text-black transition-colors"
                        >
                          <Eye className="size-3 md:size-4" strokeWidth={3} />
                          {doc.chunk_count} 个 切 片
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:gap-4">
                    {doc.status === 'processed' ? (
                      <span className="px-3 md:px-4 py-1.5 md:py-2 bg-white border-2 md:border-4 border-black text-black text-xs md:text-sm font-black tracking-widest rounded-xl neo-shadow-sm inline-flex items-center gap-1.5 md:gap-2">
                        <CheckCircle2 className="size-4 md:size-5 text-green-500" strokeWidth={3} />
                        已 处 理
                      </span>
                    ) : (
                      <span className="px-3 md:px-4 py-1.5 md:py-2 bg-white border-2 md:border-4 border-black text-slate-500 text-xs md:text-sm font-black tracking-widest rounded-xl neo-shadow-sm inline-flex items-center gap-1.5 md:gap-2">
                        <Loader2 className="size-4 md:size-5 animate-spin" strokeWidth={3} />
                        处 理 中
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id, doc.name)}
                      className="p-2 md:p-3 bg-white border-2 md:border-4 border-black text-black rounded-xl neo-shadow-sm hover:bg-black hover:text-white transition-colors group-hover:scale-110"
                    >
                      <Trash2 className="size-5 md:size-6" strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="删除文档"
        message={`确定删除文档「${confirmDelete?.name}」？删除后无法恢复。`}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}