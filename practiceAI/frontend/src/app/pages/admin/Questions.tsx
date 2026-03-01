import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { staticQuestionApi } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';

interface Question {
  id: number;
  type: 'choice' | 'essay';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export default function AdminQuestions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ['all', 'AI产品基础', 'AI需求分析与设计', 'AI模型与技术选型'];

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params: { category?: string; type?: string; search?: string } = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedType !== 'all') params.type = selectedType;
      if (searchQuery) params.search = searchQuery;
      const data = await staticQuestionApi.list(params);
      setQuestions(data);
    } catch (err: any) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedCategory, selectedType, searchQuery]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await staticQuestionApi.delete(confirmDeleteId);
      setQuestions((prev) => prev.filter((q) => q.id !== confirmDeleteId));
      toast.success('题目已删除');
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  const AddQuestionModal = () => {
    const isEditing = !!editingQuestion;
    const [formData, setFormData] = useState({
      type: editingQuestion?.type || ('choice' as 'choice' | 'essay'),
      question: editingQuestion?.question || '',
      options: editingQuestion?.options || ['', '', '', ''],
      correct_answer: editingQuestion?.correct_answer || '',
      explanation: editingQuestion?.explanation || '',
      category: editingQuestion?.category || 'AI产品基础',
      difficulty: editingQuestion?.difficulty || ('medium' as 'easy' | 'medium' | 'hard'),
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      setSubmitting(true);
      try {
        const payload: any = {
          type: formData.type,
          question: formData.question,
          correct_answer: formData.correct_answer,
          explanation: formData.explanation,
          category: formData.category,
          difficulty: formData.difficulty,
        };
        if (formData.type === 'choice') {
          payload.options = formData.options;
        }

        if (isEditing && editingQuestion) {
          await staticQuestionApi.update(editingQuestion.id, payload);
          toast.success('题目已更新');
        } else {
          await staticQuestionApi.create(payload);
          toast.success('题目已添加');
        }
        setIsModalOpen(false);
        setEditingQuestion(null);
        loadQuestions();
      } catch (err: any) {
        toast.error(err.message || '操作失败');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl border-4 border-black neo-shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b-4 border-black bg-[#FDE047]">
            <h2 className="text-3xl font-black text-black tracking-widest">
              {isEditing ? '编 辑 题 目' : '添 加 新 题 目'}
            </h2>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label className="block text-xl font-black mb-3 text-black tracking-widest">题 型</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'choice' | 'essay' })
                }
                className="w-full px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] bg-white text-xl font-bold text-black neo-input"
              >
                <option value="choice">选 择 题</option>
                <option value="essay">问 答 题</option>
              </select>
            </div>

            <div>
              <label className="block text-xl font-black mb-3 text-black tracking-widest">题 目 内 容</label>
              <textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] resize-none bg-white text-lg font-bold text-black neo-input"
                rows={3}
                placeholder="输 入 题 目 内 容..."
              />
            </div>

            {formData.type === 'choice' && (
              <div>
                <label className="block text-xl font-black mb-3 text-black tracking-widest">选 项 ( 选 择 正 确 答 案 )</label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-4 mb-4">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formData.correct_answer === option}
                      onChange={() => setFormData({ ...formData, correct_answer: option })}
                      className="size-6 border-4 border-black accent-black cursor-pointer"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      className="flex-1 px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] bg-white text-lg font-bold text-black neo-input"
                      placeholder={`选 项 ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {formData.type === 'essay' && (
              <div>
                <label className="block text-xl font-black mb-3 text-black tracking-widest">参 考 答 案</label>
                <textarea
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  className="w-full px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] resize-none bg-white text-lg font-bold text-black neo-input"
                  rows={2}
                  placeholder="输 入 参 考 答 案..."
                />
              </div>
            )}

            <div>
              <label className="block text-xl font-black mb-3 text-black tracking-widest">解 析</label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                className="w-full px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] resize-none bg-white text-lg font-bold text-black neo-input"
                rows={2}
                placeholder="输 入 答 案 解 析..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xl font-black mb-3 text-black tracking-widest">分 类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] bg-white text-lg font-black text-black neo-input"
                >
                  {categories.filter((c) => c !== 'all').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xl font-black mb-3 text-black tracking-widest">难 度</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                    })
                  }
                  className="w-full px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] bg-white text-lg font-black text-black neo-input"
                >
                  <option value="easy">简 单</option>
                  <option value="medium">中 等</option>
                  <option value="hard">困 难</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 border-t-4 border-black bg-slate-50 flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-[#2563EB] text-white border-4 border-black text-xl font-black tracking-widest rounded-xl neo-shadow-sm hover:neo-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50"
            >
              {submitting ? '保 存 中...' : isEditing ? '保 存 修 改' : '添 加 题 目'}
            </button>
            <button
              onClick={() => { setIsModalOpen(false); setEditingQuestion(null); }}
              className="flex-1 px-6 py-4 bg-white text-black border-4 border-black text-xl font-black tracking-widest rounded-xl hover:bg-black/5 transition-all"
            >
              取 消
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="size-full overflow-auto bg-[#FFFDF5]">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h1 className="text-5xl md:text-7xl font-black font-[Syne] tracking-tighter text-slate-900 leading-none mb-2">
              题 目 <br /><span className="text-[#2563EB] text-outline">配 置</span>
            </h1>
          </div>
          <div className="mt-6 md:mt-0">
            <button
              onClick={() => {
                setIsModalOpen(true);
                setEditingQuestion(null);
              }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#2563EB] text-white border-4 border-black rounded-2xl neo-shadow-sm hover:neo-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-xl font-black uppercase tracking-widest"
            >
              <Plus className="size-6" strokeWidth={3} />
              添 加 题 目
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border-4 border-black p-4 mb-12 neo-shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-4 size-6 text-slate-500" strokeWidth={3} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜 索 题 目..."
                className="w-full pl-14 pr-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] text-xl font-black text-black placeholder:text-slate-400 placeholder:font-black tracking-widest neo-input"
              />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="hidden md:flex items-center justify-center p-3 border-4 border-black rounded-xl bg-black text-white neo-shadow-sm">
                <Filter className="size-6" strokeWidth={3} />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full lg:w-48 px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] text-lg font-black tracking-widest bg-white text-black neo-input"
              >
                <option value="all">全 部 题 型</option>
                <option value="choice">选 择 题</option>
                <option value="essay">问 答 题</option>
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full lg:w-64 px-4 py-3 border-4 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F9A8D4] text-lg font-black tracking-widest bg-white text-black neo-input"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? '全 部 分 类' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-[#2563EB] rounded-3xl border-4 border-black p-6 neo-shadow-sm hover:neo-shadow transition-all group">
            <div className="text-5xl md:text-6xl font-black text-white mb-2 group-hover:scale-110 origin-left transition-transform">
              {loading ? '...' : questions.length}
            </div>
            <div className="text-sm font-black tracking-widest text-[#FFFDF5]">总 题 目 数</div>
          </div>
          <div className="bg-white rounded-3xl border-4 border-black p-6 neo-shadow-sm hover:neo-shadow transition-all group">
            <div className="text-5xl md:text-6xl font-black text-black mb-2 group-hover:scale-110 origin-left transition-transform">
              {loading ? '...' : questions.filter((q) => q.type === 'choice').length}
            </div>
            <div className="text-sm font-black tracking-widest text-slate-500">选 择 题 数</div>
          </div>
          <div className="bg-[#FDE047] rounded-3xl border-4 border-black p-6 neo-shadow-sm hover:neo-shadow transition-all group">
            <div className="text-5xl md:text-6xl font-black text-black mb-2 group-hover:scale-110 origin-left transition-transform">
              {loading ? '...' : questions.filter((q) => q.type === 'essay').length}
            </div>
            <div className="text-sm font-black tracking-widest text-slate-800">问 答 题 数</div>
          </div>
          <div className="bg-[#F9A8D4] rounded-3xl border-4 border-black p-6 neo-shadow-sm hover:neo-shadow transition-all group">
            <div className="text-5xl md:text-6xl font-black text-black mb-2 group-hover:scale-110 origin-left transition-transform">
              {categories.length - 1}
            </div>
            <div className="text-sm font-black tracking-widest text-slate-800">分 类 数</div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.map((question) => (
            <div
              key={question.id}
              className="bg-white rounded-3xl border-4 border-black p-8 neo-shadow-sm hover:neo-shadow transition-all group relative overflow-hidden flex flex-col"
            >
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mb-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={`px-3 py-1 border-2 border-black rounded-full text-xs font-black tracking-widest ${question.type === 'choice'
                        ? 'bg-black text-white'
                        : 'bg-[#FDE047] text-black'
                        }`}
                    >
                      {question.type === 'choice' ? '选 择 题' : '问 答 题'}
                    </span>
                    <span className="px-3 py-1 bg-white border-2 border-slate-300 text-slate-600 rounded-full text-xs font-black tracking-widest">
                      {question.category}
                    </span>
                    <span
                      className={`px-3 py-1 border-2 border-black rounded-full text-xs font-black tracking-widest ${question.difficulty === 'easy'
                        ? 'bg-green-300 text-black'
                        : question.difficulty === 'medium'
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#F9A8D4] text-black'
                        }`}
                    >
                      {question.difficulty === 'easy'
                        ? '简 单'
                        : question.difficulty === 'medium'
                          ? '中 等'
                          : '困 难'}
                    </span>
                  </div>
                  <h3 className="font-black text-2xl text-black mb-4 leading-relaxed">{question.question}</h3>
                  {question.type === 'choice' && question.options && (
                    <div className="space-y-4 text-lg font-bold">
                      {question.options.map((option, index) => (
                        <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border-2 ${option === question.correct_answer ? 'border-black bg-[#FDE047]' : 'border-transparent bg-slate-50'}`}>
                          <span className={`font-black ${option === question.correct_answer ? 'text-black' : 'text-slate-500'}`}>
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <span className={`${option === question.correct_answer ? 'text-black' : 'text-slate-700'}`}>
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex lg:flex-col gap-3">
                  <button
                    onClick={() => handleEdit(question)}
                    className="p-3 bg-white border-4 border-black text-black rounded-xl neo-shadow-sm hover:bg-black hover:text-white transition-colors group-hover:scale-110"
                    title="编辑"
                  >
                    <Edit2 className="size-6" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="p-3 bg-[#F9A8D4] border-4 border-black text-black rounded-xl neo-shadow-sm hover:bg-black hover:text-white transition-colors group-hover:scale-110"
                    title="删除"
                  >
                    <Trash2 className="size-6" strokeWidth={3} />
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t-4 border-black mt-auto">
                <p className="text-base font-bold text-slate-700 leading-relaxed bg-slate-100 p-4 rounded-xl border-2 border-dashed border-slate-300 h-full">
                  <span className="font-black text-black tracking-widest block mb-1">【 解 析 】</span>
                  {question.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>

        {!loading && questions.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-4 border-black border-dashed">
            <p className="text-xl font-black text-slate-400 tracking-widest font-mono">[ 暂 无 题 目 ]</p>
          </div>
        )}

        {isModalOpen && <AddQuestionModal />}

        {/* 删除确认弹窗 */}
        <ConfirmDialog
          open={!!confirmDeleteId}
          title="削 除 题 目"
          message="确定删除该题目？删除后无法恢复。"
          confirmLabel="削 除"
          cancelLabel="取 消"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    </div>
  );
}