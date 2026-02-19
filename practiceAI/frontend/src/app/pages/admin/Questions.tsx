import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { questionApi } from '../../api';

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
      const data = await questionApi.list(params);
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

  const handleDelete = async (id: number) => {
    try {
      await questionApi.delete(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success('题目已删除');
    } catch (err: any) {
      toast.error(err.message || '删除失败');
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
          await questionApi.update(editingQuestion.id, payload);
          toast.success('题目已更新');
        } else {
          await questionApi.create(payload);
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">
            {isEditing ? '编辑题目' : '添加新题目'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2 text-foreground">题型</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'choice' | 'essay' })
                }
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground"
              >
                <option value="choice">选择题</option>
                <option value="essay">问答题</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2 text-foreground">题目</label>
              <textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-input-background text-foreground"
                rows={3}
                placeholder="输入题目内容..."
              />
            </div>

            {formData.type === 'choice' && (
              <div>
                <label className="block font-medium mb-2 text-foreground">选项</label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formData.correct_answer === option}
                      onChange={() => setFormData({ ...formData, correct_answer: option })}
                      className="flex-none"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground"
                      placeholder={`选项 ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {formData.type === 'essay' && (
              <div>
                <label className="block font-medium mb-2 text-foreground">参考答案</label>
                <textarea
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-input-background text-foreground"
                  rows={2}
                  placeholder="输入参考答案..."
                />
              </div>
            )}

            <div>
              <label className="block font-medium mb-2 text-foreground">解析</label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-input-background text-foreground"
                rows={2}
                placeholder="输入答案解析..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2 text-foreground">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground"
                >
                  {categories.filter((c) => c !== 'all').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-2 text-foreground">难度</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                    })
                  }
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground"
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? '保存中...' : isEditing ? '保存修改' : '添加题目'}
            </button>
            <button
              onClick={() => { setIsModalOpen(false); setEditingQuestion(null); }}
              className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="size-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl mb-2 text-foreground">题库管理</h1>
            <p className="text-sm text-muted-foreground">管理练习题目</p>
          </div>
          <button
            onClick={() => {
              setIsModalOpen(true);
              setEditingQuestion(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-semibold"
          >
            <Plus className="size-4" />
            添加题目
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索题目..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-input-background text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-5 text-muted-foreground" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-input-background text-foreground"
              >
                <option value="all">全部题型</option>
                <option value="choice">选择题</option>
                <option value="essay">问答题</option>
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-input-background text-foreground"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? '全部分类' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
            <div className="text-2xl font-extrabold text-primary mb-1">
              {loading ? '...' : questions.length}
            </div>
            <div className="text-sm text-muted-foreground">总题目数</div>
          </div>
          <div className="bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
            <div className="text-2xl font-extrabold text-primary mb-1">
              {loading ? '...' : questions.filter((q) => q.type === 'choice').length}
            </div>
            <div className="text-sm text-muted-foreground">选择题</div>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <div className="text-2xl font-bold text-success mb-1">
              {loading ? '...' : questions.filter((q) => q.type === 'essay').length}
            </div>
            <div className="text-sm text-muted-foreground">问答题</div>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <div className="text-2xl font-extrabold text-accent-foreground mb-1">{categories.length - 1}</div>
            <div className="text-sm text-muted-foreground">分类数</div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question) => (
            <div
              key={question.id}
              className="bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${question.type === 'choice'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-success/10 text-success'
                        }`}
                    >
                      {question.type === 'choice' ? '选择题' : '问答题'}
                    </span>
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      {question.category}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${question.difficulty === 'easy'
                        ? 'bg-success/10 text-success'
                        : question.difficulty === 'medium'
                          ? 'bg-accent/20 text-accent-foreground'
                          : 'bg-destructive/10 text-destructive'
                        }`}
                    >
                      {question.difficulty === 'easy'
                        ? '简单'
                        : question.difficulty === 'medium'
                          ? '中等'
                          : '困难'}
                    </span>
                  </div>
                  <h3 className="font-medium text-lg mb-2 text-foreground">{question.question}</h3>
                  {question.type === 'choice' && question.options && (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {question.options.map((option, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span
                            className={
                              option === question.correct_answer ? 'text-success font-medium' : ''
                            }
                          >
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <span
                            className={
                              option === question.correct_answer ? 'text-success font-medium' : ''
                            }
                          >
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(question)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="size-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">解析：</span>
                  {question.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>

        {!loading && questions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>暂无题目</p>
          </div>
        )}

        {isModalOpen && <AddQuestionModal />}
      </div>
    </div>
  );
}