import { useState, useEffect, useCallback } from 'react';
import { Save, CheckCircle, Loader2, Sparkles, Plus, Trash2, BookOpen, ArrowLeft, Eye, RefreshCw, Pencil, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi, practiceApi, questionSetApi } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';

interface KnowledgeBase {
  id: string;
  name: string;
}

interface QuestionSetItem {
  id: number;
  topic_name: string;
  knowledge_base_name: string;
  question_count: number;
  actual_count: number;
  difficulty: string;
  status: string;
  is_active: boolean;
  created_at: string;
}

interface QuestionDetail {
  id: number;
  question_type: string;
  content: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  sort_order: number;
}

type PageView = 'list' | 'create' | 'edit' | 'detail';

export default function AdminSettings() {
  // 页面视图
  const [view, setView] = useState<PageView>('list');
  const [questionSets, setQuestionSets] = useState<QuestionSetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);

  // 新建表单
  const [form, setForm] = useState({
    topic_name: '',
    knowledge_base_id: '',
    question_count: 3,
    question_types: ['choice'] as string[],
    difficulty: 'medium',
    focus: ['concept'] as string[],
    custom_instruction: '',
  });
  const [creating, setCreating] = useState(false);

  // 题目详情
  const [detailSetId, setDetailSetId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingQid, setEditingQid] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ content: '', answer: '', explanation: '', options: '' });

  // 编辑题目集
  const [editSetId, setEditSetId] = useState<number | null>(null);

  // 手动添加题目
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    question_type: 'choice' as string,
    content: '',
    options: 'A. \nB. \nC. \nD. ',
    answer: '',
    explanation: '',
  });

  // 批改设置（保留在列表页下方）
  const [gradingSettings, setGradingSettings] = useState({
    gradingStrictness: 'medium',
    gradingStyle: 'encouraging',
    passingScore: 60,
    showAnswer: true,
    gradingCustomInstruction: '',
    timeLimit: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sets, kbList, settings] = await Promise.all([
        questionSetApi.listSets().catch(() => []),
        practiceApi.getKnowledgeBases().catch(() => []),
        settingsApi.get().catch(() => null),
      ]);
      setQuestionSets(sets || []);
      const filteredKbs = (kbList || []).filter((kb: KnowledgeBase) => kb.id !== 'all');
      setKnowledgeBases(filteredKbs);
      if (filteredKbs.length > 0 && !form.knowledge_base_id) {
        setForm(f => ({ ...f, knowledge_base_id: filteredKbs[0].id }));
      }
      if (settings) {
        setGradingSettings({
          gradingStrictness: settings.grading_strictness ?? 'medium',
          gradingStyle: settings.grading_style ?? 'encouraging',
          passingScore: settings.passing_score ?? 60,
          showAnswer: settings.show_answer ?? true,
          gradingCustomInstruction: settings.grading_custom_instruction ?? '',
          timeLimit: settings.time_limit ?? 0,
        });
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  // 定时轮询 generating 状态的题目集
  useEffect(() => {
    const hasGenerating = questionSets.some(s => s.status === 'generating');
    if (!hasGenerating) return;
    const timer = setInterval(async () => {
      try {
        const sets = await questionSetApi.listSets();
        setQuestionSets(sets || []);
        if (!sets?.some((s: QuestionSetItem) => s.status === 'generating')) {
          clearInterval(timer);
          toast.success('题目生成完成！');
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(timer);
  }, [questionSets]);

  const handleCreate = async () => {
    if (!form.topic_name.trim()) { toast.error('请输入主题名称'); return; }
    if (!form.knowledge_base_id) { toast.error('请选择关联知识库'); return; }
    try {
      setCreating(true);
      // 同时保存批改设置
      await settingsApi.update({
        grading_strictness: gradingSettings.gradingStrictness,
        grading_style: gradingSettings.gradingStyle,
        passing_score: gradingSettings.passingScore,
        show_answer: gradingSettings.showAnswer,
        grading_custom_instruction: gradingSettings.gradingCustomInstruction,
        time_limit: gradingSettings.timeLimit,
      });
      if (view === 'edit' && editSetId) {
        // 编辑模式：更新配置并重新生成题目
        await questionSetApi.updateSet(editSetId, form);
        await questionSetApi.regenerate(editSetId);
        toast('配置已保存，AI 正在重新生成题目...', { icon: '⏳' });
      } else {
        // 新建模式：创建并生成
        await questionSetApi.createSet(form);
        toast('AI 正在生成题目...', { icon: '⏳' });
      }
      setView('list');
      setEditSetId(null);
      setForm(f => ({ ...f, topic_name: '', question_count: 3, custom_instruction: '' }));
      const sets = await questionSetApi.listSets();
      setQuestionSets(sets || []);
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = async (setId: number) => {
    try {
      const data = await questionSetApi.getSet(setId);
      setForm({
        topic_name: data.topic_name || '',
        knowledge_base_id: data.knowledge_base_id || '',
        question_count: data.question_count || 3,
        question_types: data.question_types || ['choice'],
        difficulty: data.difficulty || 'medium',
        focus: data.focus || [],
        custom_instruction: data.custom_instruction || '',
      });
      setEditSetId(setId);
      setView('edit');
    } catch (err: any) {
      toast.error(err.message || '加载失败');
    }
  };

  const handleAddQuestion = async () => {
    if (!detailSetId) return;
    if (!addForm.content.trim()) { toast.error('请输入题目内容'); return; }
    if (!addForm.answer.trim()) { toast.error('请输入正确答案'); return; }
    try {
      const payload: any = {
        question_type: addForm.question_type,
        content: addForm.content,
        answer: addForm.answer,
        explanation: addForm.explanation,
      };
      if (addForm.question_type === 'choice' && addForm.options.trim()) {
        payload.options = addForm.options.split('\n').filter(Boolean);
      }
      await questionSetApi.addQuestion(detailSetId, payload);
      toast.success('题目已添加');
      setShowAddForm(false);
      setAddForm({ question_type: 'choice', content: '', options: 'A. \nB. \nC. \nD. ', answer: '', explanation: '' });
      const data = await questionSetApi.getSet(detailSetId);
      setDetailData(data);
    } catch (err: any) {
      toast.error(err.message || '添加失败');
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'set' | 'question'; id: number; name: string } | null>(null);

  const handleDelete = async (id: number, name: string) => {
    setConfirmDelete({ type: 'set', id, name });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'set') {
        await questionSetApi.deleteSet(confirmDelete.id);
        setQuestionSets(prev => prev.filter(s => s.id !== confirmDelete.id));
      } else {
        await questionSetApi.deleteQuestion(confirmDelete.id);
        if (detailSetId) {
          const data = await questionSetApi.getSet(detailSetId);
          setDetailData(data);
        }
      }
      toast.success('已删除');
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleRegenerate = async (id: number) => {
    try {
      await questionSetApi.regenerate(id);
      toast('正在重新生成...', { icon: '⏳' });
      const sets = await questionSetApi.listSets();
      setQuestionSets(sets || []);
    } catch (err: any) {
      toast.error(err.message || '重新生成失败');
    }
  };

  const openDetail = async (setId: number) => {
    setDetailSetId(setId);
    setView('detail');
    setDetailLoading(true);
    try {
      const data = await questionSetApi.getSet(setId);
      setDetailData(data);
    } catch (err: any) {
      toast.error(err.message || '加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const startEditQuestion = (q: QuestionDetail) => {
    setEditingQid(q.id);
    setEditForm({
      content: q.content,
      answer: q.answer,
      explanation: q.explanation,
      options: q.options ? q.options.join('\n') : '',
    });
  };

  const saveQuestion = async (qid: number) => {
    try {
      const payload: any = {
        content: editForm.content,
        answer: editForm.answer,
        explanation: editForm.explanation,
      };
      if (editForm.options.trim()) {
        payload.options = editForm.options.split('\n').filter(Boolean);
      }
      await questionSetApi.updateQuestion(qid, payload);
      toast.success('题目已更新');
      setEditingQid(null);
      // 刷新详情
      if (detailSetId) {
        const data = await questionSetApi.getSet(detailSetId);
        setDetailData(data);
      }
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    }
  };

  const deleteQuestion = async (qid: number) => {
    setConfirmDelete({ type: 'question', id: qid, name: '该题目' });
  };

  const saveGradingSettings = async () => {
    try {
      await settingsApi.update({
        grading_strictness: gradingSettings.gradingStrictness,
        grading_style: gradingSettings.gradingStyle,
        passing_score: gradingSettings.passingScore,
        show_answer: gradingSettings.showAnswer,
        grading_custom_instruction: gradingSettings.gradingCustomInstruction,
        time_limit: gradingSettings.timeLimit,
      });
      toast.success('配置成功！');
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    }
  };

  const toggleQuestionType = (type: string) => {
    setForm(prev => {
      const newTypes = prev.question_types.includes(type)
        ? prev.question_types.filter(t => t !== type)
        : [...prev.question_types, type];
      if (newTypes.length === 0) return prev;
      return { ...prev, question_types: newTypes };
    });
  };

  const toggleFocus = (focus: string) => {
    setForm(prev => {
      const newFocus = prev.focus.includes(focus)
        ? prev.focus.filter(f => f !== focus)
        : [...prev.focus, focus];
      return { ...prev, focus: newFocus };
    });
  };

  const diffLabel = (d: string) => ({ easy: '😊 简单', medium: '🤔 适中', hard: '🔥 困难' }[d] || d);
  const statusLabel = (s: string) => ({
    draft: '草稿',
    generating: '⏳ 生成中...',
    ready: '✅ 已就绪',
    error: '❌ 生成失败',
  }[s] || s);
  const statusColor = (s: string) => ({
    generating: 'text-amber-600 bg-amber-50',
    ready: 'text-success bg-success/10',
    error: 'text-red-600 bg-red-50',
    draft: 'text-muted-foreground bg-muted',
  }[s] || 'text-muted-foreground bg-muted');

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ==================== 题目详情视图 ====================
  if (view === 'detail' && detailSetId) {
    return (
      <div className="size-full overflow-auto bg-background">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <button
            onClick={() => { setView('list'); setDetailData(null); setEditingQid(null); }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            返回列表
          </button>

          {detailLoading ? (
            <div className="text-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          ) : detailData ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{detailData.topic_name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {detailData.knowledge_base_name} · {detailData.questions?.length || 0} 道题
                  </p>
                </div>
                <button
                  onClick={() => handleRegenerate(detailSetId)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <RefreshCw className="size-4" />
                  重新生成
                </button>
              </div>

              <div className="space-y-4">
                {(detailData.questions || []).map((q: QuestionDetail, idx: number) => (
                  <div key={q.id} className={`bg-card rounded-xl border overflow-hidden ${editingQid === q.id ? 'border-primary' : 'border-border'}`}>
                    <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          第 {idx + 1} 题
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded">
                          {q.question_type === 'choice' ? '选择题' : '问答题'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {editingQid === q.id ? (
                          <>
                            <button onClick={() => setEditingQid(null)} className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground rounded">取消</button>
                            <button onClick={() => saveQuestion(q.id)} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md">保存</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditQuestion(q)} className="p-1.5 text-muted-foreground hover:text-primary rounded" title="编辑">
                              <Pencil className="size-3.5" />
                            </button>
                            <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded" title="删除">
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      {editingQid === q.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">题目内容</label>
                            <textarea
                              value={editForm.content}
                              onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                              className="w-full p-3 border border-border rounded-lg bg-input-background text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          {q.question_type === 'choice' && (
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">选项（每行一个）</label>
                              <textarea
                                value={editForm.options}
                                onChange={e => setEditForm(f => ({ ...f, options: e.target.value }))}
                                className="w-full p-3 border border-border rounded-lg bg-input-background text-sm resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">正确答案</label>
                            <textarea
                              value={editForm.answer}
                              onChange={e => setEditForm(f => ({ ...f, answer: e.target.value }))}
                              className="w-full p-3 border border-border rounded-lg bg-input-background text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">解析</label>
                            <textarea
                              value={editForm.explanation}
                              onChange={e => setEditForm(f => ({ ...f, explanation: e.target.value }))}
                              className="w-full p-3 border border-border rounded-lg bg-input-background text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground mb-3 leading-relaxed whitespace-pre-wrap">{q.content}</p>
                          {q.options && q.options.length > 0 && (
                            <div className="space-y-1.5 mb-3 pl-2">
                              {q.options.map((opt: string, i: number) => (
                                <div key={i} className={`text-sm py-1 px-2 rounded ${q.answer && opt.startsWith(q.answer.charAt(0)) ? 'bg-success/10 text-success font-medium' : 'text-muted-foreground'}`}>
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">✅ 答案：</p>
                            <p className="text-sm text-foreground">{q.answer}</p>
                          </div>
                          {q.explanation && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1">💡 解析：</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{q.explanation}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {(!detailData.questions || detailData.questions.length === 0) && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {detailData.status === 'generating' ? '题目正在生成中，请稍候...' : '暂无题目'}
                </div>
              )}

              {/* 手动添加题目 */}
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full mt-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="size-4" />
                  手动添加题目
                </button>
              ) : (
                <div className="mt-4 bg-card rounded-xl border-2 border-primary p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">添加新题目</h4>
                    <button onClick={() => setShowAddForm(false)} className="text-xs text-muted-foreground hover:text-foreground">取消</button>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">题型</label>
                    <div className="flex gap-2">
                      {[{ id: 'choice', label: '选择题' }, { id: 'essay', label: '问答题' }].map(t => (
                        <button key={t.id} onClick={() => setAddForm(f => ({ ...f, question_type: t.id }))}
                          className={`px-4 py-1.5 text-sm rounded-lg border transition-all cursor-pointer ${addForm.question_type === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                        >{t.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">题目内容 *</label>
                    <textarea value={addForm.content} onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))}
                      placeholder="输入题目内容..."
                      className="w-full p-3 border border-border rounded-lg bg-input-background text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  {addForm.question_type === 'choice' && (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">选项（每行一个）</label>
                      <textarea value={addForm.options} onChange={e => setAddForm(f => ({ ...f, options: e.target.value }))}
                        className="w-full p-3 border border-border rounded-lg bg-input-background text-sm resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">正确答案 *</label>
                    <textarea value={addForm.answer} onChange={e => setAddForm(f => ({ ...f, answer: e.target.value }))}
                      placeholder="输入正确答案..."
                      className="w-full p-3 border border-border rounded-lg bg-input-background text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">解析（可选）</label>
                    <textarea value={addForm.explanation} onChange={e => setAddForm(f => ({ ...f, explanation: e.target.value }))}
                      placeholder="输入解析..."
                      className="w-full p-3 border border-border rounded-lg bg-input-background text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <button onClick={handleAddQuestion}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    添加题目
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // ==================== 新建/编辑配置视图 ====================
  if (view === 'create' || view === 'edit') {
    const isEdit = view === 'edit';
    return (
      <div className="size-full overflow-auto bg-background">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <button
            onClick={() => { setView('list'); setEditSetId(null); }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            返回列表
          </button>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">{isEdit ? '编辑题目集' : '新建题目集'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isEdit ? '修改题目集配置' : '配置出题参数，AI 将自动生成题目'}</p>
          </div>

          <div className="space-y-5">
            {/* 基本信息 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">主题名称 *</label>
                  <input
                    type="text"
                    value={form.topic_name}
                    onChange={e => setForm(f => ({ ...f, topic_name: e.target.value }))}
                    placeholder="如：RAG 基础概念"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">关联知识库 *</label>
                  <select
                    value={form.knowledge_base_id}
                    onChange={e => setForm(f => ({ ...f, knowledge_base_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {knowledgeBases.map(kb => (
                      <option key={kb.id} value={kb.id}>{kb.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">出题数量</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.question_count}
                    onChange={e => setForm(f => ({ ...f, question_count: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* 题型选择 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">题型选择</h3>
              <div className="space-y-3">
                {[
                  { id: 'choice', label: '选择题', desc: '单选题，AI 自动出选项和解析' },
                  { id: 'essay', label: '问答题', desc: '开放式问题，AI 自动批改和反馈' },
                ].map(t => (
                  <label key={t.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.question_types.includes(t.id)}
                      onChange={() => toggleQuestionType(t.id)}
                      className="size-5 rounded"
                      style={{ accentColor: '#00B894' }}
                    />
                    <div>
                      <div className="font-medium text-foreground">{t.label}</div>
                      <div className="text-sm text-muted-foreground">{t.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 难度 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">难度级别</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'easy', label: '😊 简单', desc: '基础概念' },
                  { id: 'medium', label: '🤔 适中', desc: '考查理解' },
                  { id: 'hard', label: '🔥 困难', desc: '综合应用' },
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setForm(f => ({ ...f, difficulty: d.id }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${form.difficulty === d.id ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}
                  >
                    <div className="font-medium text-foreground mb-1">{d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 考查侧重点 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">考查侧重点（可多选）</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'concept', label: '📖 概念理解' },
                  { id: 'compare', label: '🔄 对比分析' },
                  { id: 'apply', label: '💡 实际应用' },
                  { id: 'process', label: '📋 流程步骤' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => toggleFocus(f.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${form.focus.includes(f.id) ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}
                  >
                    <div className="font-medium text-foreground text-sm">{f.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义指令 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold text-foreground mb-1">自定义出题指令</h3>
              <p className="text-sm text-muted-foreground mb-4">给 AI 额外的补充要求（可选）</p>
              <textarea
                value={form.custom_instruction}
                onChange={e => setForm(f => ({ ...f, custom_instruction: e.target.value }))}
                placeholder="例如：侧重考查 RAG 检索部分的知识点；多出关于向量数据库的题..."
                className="w-full px-4 py-3 border border-border rounded-lg bg-input-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={3}
              />
            </div>

            {/* ===== 分隔线 ===== */}
            <div className="border-t border-border pt-6 mt-2">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle className="size-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">批改与通用设置</h2>
              </div>
            </div>

            {/* 批改严格程度 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold mb-1 text-foreground">批改严格程度</h3>
              <p className="text-sm text-muted-foreground mb-4">控制 AI 批改问答题时的评判标准</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'lenient', label: '🟢 宽松', desc: '答到大意即算正确' },
                  { id: 'medium', label: '🟡 适中', desc: '需覆盖主要得分点' },
                  { id: 'strict', label: '🔴 严格', desc: '必须准确覆盖所有要点' },
                ].map(level => (
                  <button
                    key={level.id}
                    onClick={() => setGradingSettings(s => ({ ...s, gradingStrictness: level.id }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${gradingSettings.gradingStrictness === level.id ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}
                  >
                    <div className="font-medium text-foreground mb-1">{level.label}</div>
                    <div className="text-xs text-muted-foreground">{level.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 反馈风格 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold mb-1 text-foreground">反馈风格</h3>
              <p className="text-sm text-muted-foreground mb-4">AI 批改时给学生反馈的语气风格</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'encouraging', label: '💪 鼓励型', desc: '多表扬，积极引导' },
                  { id: 'objective', label: '📊 客观型', desc: '就事论事，中立评价' },
                  { id: 'strict', label: '📐 严厉型', desc: '高标准，严要求' },
                ].map(style => (
                  <button
                    key={style.id}
                    onClick={() => setGradingSettings(s => ({ ...s, gradingStyle: style.id }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${gradingSettings.gradingStyle === style.id ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}
                  >
                    <div className="font-medium text-foreground mb-1">{style.label}</div>
                    <div className="text-xs text-muted-foreground">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 评分规则 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold mb-4 text-foreground">评分规则</h3>
              <div className="space-y-5">
                <div>
                  <label className="block mb-2">
                    <span className="font-medium text-foreground">及格分数</span>
                    <span className="text-sm text-muted-foreground ml-2">满分 100</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min="0" max="100" step="5"
                      value={gradingSettings.passingScore}
                      onChange={e => setGradingSettings(s => ({ ...s, passingScore: parseInt(e.target.value) }))}
                      className="flex-1" style={{ accentColor: '#00B894' }}
                    />
                    <div className="flex-none w-16 text-center">
                      <div className="text-2xl font-bold text-primary">{gradingSettings.passingScore}</div>
                      <div className="text-xs text-muted-foreground">分</div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-medium text-foreground">答错后展示参考答案</div>
                      <div className="text-sm text-muted-foreground">提交后立即显示正确答案和解析</div>
                    </div>
                    <input
                      type="checkbox" checked={gradingSettings.showAnswer}
                      onChange={e => setGradingSettings(s => ({ ...s, showAnswer: e.target.checked }))}
                      className="size-5 rounded" style={{ accentColor: '#00B894' }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 答题时限 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <label className="block mb-2">
                <span className="font-medium text-foreground">答题时限（分钟）</span>
                <span className="text-sm text-muted-foreground ml-2">0 表示不限时</span>
              </label>
              <input
                type="number" min="0" max="120" step="5"
                value={gradingSettings.timeLimit}
                onChange={e => setGradingSettings(s => ({ ...s, timeLimit: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-5 animate-spin" /> : (isEdit ? <Save className="size-5" /> : <Sparkles className="size-5" />)}
              {creating ? '配置中...' : (isEdit ? '保存并开始配置题目' : '保存配置并生成题目')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 列表视图（默认） ====================
  return (
    <div className="size-full overflow-auto bg-background">
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">题目配置</h1>
            <p className="text-sm text-muted-foreground mt-1">管理 AI 生成的题目集</p>
          </div>
          <button
            onClick={() => setView('create')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            新增题目集
          </button>
        </div>

        {/* 题目集列表 */}
        <div className="space-y-3 mb-10">
          {questionSets.length === 0 ? (
            <div className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center">
              <BookOpen className="size-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-1">暂无题目集</p>
              <p className="text-xs text-muted-foreground">点击右上角「新增题目集」开始配置</p>
            </div>
          ) : (
            questionSets.map(s => (
              <div
                key={s.id}
                className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(s.id)}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-medium text-foreground truncate">{s.topic_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>
                        {statusLabel(s.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{s.knowledge_base_name || '全部知识库'}</span>
                      <span>{s.actual_count} 道题</span>
                      <span>{diffLabel(s.difficulty)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openDetail(s.id)}
                      className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      title="查看题目"
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      onClick={() => openEdit(s.id)}
                      className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      title="编辑配置"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleRegenerate(s.id)}
                      className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      title="重新生成"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.topic_name)}
                      className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <ChevronRight
                    className="size-5 text-muted-foreground ml-2 cursor-pointer"
                    onClick={() => openDetail(s.id)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.type === 'set' ? '删除题目集' : '删除题目'}
        message={confirmDelete?.type === 'set'
          ? `确定删除题目集「${confirmDelete?.name}」？删除后无法恢复。`
          : '确定删除该题目？删除后无法恢复。'}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}