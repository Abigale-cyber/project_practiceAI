import { useState, useEffect } from 'react';
import { Save, CheckCircle, Settings as SettingsIcon, Loader2, Sparkles, Plus, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi, practiceApi } from '../../api';

interface QuizTopic {
  name: string;
  knowledge_base: string;
  question_count: number;
}

interface KnowledgeBase {
  id: string;
  name: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    // 出题设置
    quizTopics: [] as QuizTopic[],
    questionTypes: ['choice', 'essay'] as string[],
    quizDifficulty: 'medium',
    quizFocus: ['concept', 'compare', 'apply', 'process'] as string[],
    quizCustomInstruction: '',
    // 批改设置
    gradingStrictness: 'medium',
    gradingStyle: 'encouraging',
    passingScore: 60,
    showAnswer: true,
    gradingCustomInstruction: '',
    // 通用设置
    timeLimit: 0,
  });

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // 并行加载设置和知识库列表
        const [data, kbList] = await Promise.all([
          settingsApi.get(),
          practiceApi.getKnowledgeBases().catch(() => []),
        ]);

        // 过滤掉 "全部知识库" 选项，主题应该关联具体知识库
        const filteredKbs = (kbList || []).filter((kb: KnowledgeBase) => kb.id !== 'all');
        setKnowledgeBases(filteredKbs);

        if (data) {
          setSettings({
            quizTopics: data.quiz_topics ?? [],
            questionTypes: data.question_types ?? ['choice', 'essay'],
            quizDifficulty: data.quiz_difficulty ?? 'medium',
            quizFocus: data.quiz_focus ?? ['concept', 'compare', 'apply', 'process'],
            quizCustomInstruction: data.quiz_custom_instruction ?? '',
            gradingStrictness: data.grading_strictness ?? 'medium',
            gradingStyle: data.grading_style ?? 'encouraging',
            passingScore: data.passing_score ?? 60,
            showAnswer: data.show_answer ?? true,
            gradingCustomInstruction: data.grading_custom_instruction ?? '',
            timeLimit: data.time_limit ?? 0,
          });
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update({
        quiz_topics: settings.quizTopics,
        question_types: settings.questionTypes,
        quiz_difficulty: settings.quizDifficulty,
        quiz_focus: settings.quizFocus,
        quiz_custom_instruction: settings.quizCustomInstruction,
        grading_strictness: settings.gradingStrictness,
        grading_style: settings.gradingStyle,
        passing_score: settings.passingScore,
        show_answer: settings.showAnswer,
        grading_custom_instruction: settings.gradingCustomInstruction,
        time_limit: settings.timeLimit,
      });
      toast.success('系统设置已保存');
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ===== 主题管理 =====
  const addTopic = () => {
    setSettings((prev) => ({
      ...prev,
      quizTopics: [
        ...prev.quizTopics,
        { name: '', knowledge_base: knowledgeBases[0]?.id || 'all', question_count: 3 },
      ],
    }));
  };

  const removeTopic = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      quizTopics: prev.quizTopics.filter((_, i) => i !== index),
    }));
  };

  const updateTopic = (index: number, field: keyof QuizTopic, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      quizTopics: prev.quizTopics.map((topic, i) =>
        i === index ? { ...topic, [field]: value } : topic
      ),
    }));
  };

  const toggleQuestionType = (type: string) => {
    setSettings((prev) => {
      const newTypes = prev.questionTypes.includes(type)
        ? prev.questionTypes.filter((t) => t !== type)
        : [...prev.questionTypes, type];
      if (newTypes.length === 0) return prev;
      return { ...prev, questionTypes: newTypes };
    });
  };

  const toggleFocus = (focus: string) => {
    setSettings((prev) => {
      const newFocus = prev.quizFocus.includes(focus)
        ? prev.quizFocus.filter((f) => f !== focus)
        : [...prev.quizFocus, focus];
      if (newFocus.length === 0) return prev;
      return { ...prev, quizFocus: newFocus };
    });
  };

  const getKnowledgeBaseName = (id: string) => {
    return knowledgeBases.find((kb) => kb.id === id)?.name || id;
  };

  // 计算总题目数
  const totalQuestions = settings.quizTopics.reduce((sum, t) => sum + t.question_count, 0);

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="size-full overflow-auto bg-background">
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 text-foreground">题目配置</h1>
          <p className="text-muted-foreground">配置 AI 出题官和批改官的行为参数</p>
        </div>

        <div className="space-y-8">

          {/* ===== 出题设置 Section ===== */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">AI 出题官设置</h2>
            </div>

            <div className="space-y-4">

              {/* 主题配置 - Core new feature */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-foreground">出题主题</h3>
                  {settings.quizTopics.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      共 <span className="font-semibold text-primary">{settings.quizTopics.length}</span> 个主题，
                      <span className="font-semibold text-primary">{totalQuestions}</span> 道题
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  设置每个主题的名称、关联知识库和出题数量。学生练习时将按主题从对应知识库中出题。
                </p>

                {/* Topic list */}
                <div className="space-y-3 mb-4">
                  {settings.quizTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-lg border border-border bg-background/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 主题名称 */}
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">主题名称</label>
                          <input
                            type="text"
                            value={topic.name}
                            onChange={(e) => updateTopic(index, 'name', e.target.value)}
                            placeholder="如：RAG 基础概念"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground text-sm"
                          />
                        </div>
                        {/* 关联知识库 */}
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">关联知识库</label>
                          <select
                            value={topic.knowledge_base}
                            onChange={(e) => updateTopic(index, 'knowledge_base', e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground text-sm"
                          >
                            {knowledgeBases.map((kb) => (
                              <option key={kb.id} value={kb.id}>
                                {kb.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* 出题数量 */}
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">出题数量</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={topic.question_count}
                              onChange={(e) =>
                                updateTopic(index, 'question_count', Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground text-sm"
                            />
                            <span className="text-sm text-muted-foreground flex-shrink-0">题</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeTopic(index)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 mt-1"
                        title="删除主题"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}

                  {settings.quizTopics.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                      <BookOpen className="size-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂未配置出题主题</p>
                      <p className="text-xs mt-1">点击下方按钮添加主题</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={addTopic}
                  className="w-full py-3 border-2 border-dashed border-primary/30 text-primary rounded-lg hover:bg-primary/5 hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus className="size-4" />
                  添加主题
                </button>
              </div>

              {/* 题型选择 */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold mb-1 text-foreground">题型选择</h3>
                <p className="text-sm text-muted-foreground mb-4">选择 AI 出题的题型范围</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.questionTypes.includes('choice')}
                      onChange={() => toggleQuestionType('choice')}
                      className="size-5 rounded"
                      style={{ accentColor: '#00B894' }}
                    />
                    <div>
                      <div className="font-medium text-foreground">选择题</div>
                      <div className="text-sm text-muted-foreground">单选题，AI 自动出选项和解析</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.questionTypes.includes('essay')}
                      onChange={() => toggleQuestionType('essay')}
                      className="size-5 rounded"
                      style={{ accentColor: '#00B894' }}
                    />
                    <div>
                      <div className="font-medium text-foreground">问答题</div>
                      <div className="text-sm text-muted-foreground">开放式问题，AI 自动批改和反馈</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 难度级别 */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold mb-1 text-foreground">难度级别</h3>
                <p className="text-sm text-muted-foreground mb-4">控制 AI 出题的难度</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'easy', label: '😊 简单', desc: '基础概念，选项区分度大' },
                    { id: 'medium', label: '🤔 适中', desc: '考查理解，选项有迷惑性' },
                    { id: 'hard', label: '🔥 困难', desc: '综合应用，需要深入分析' },
                  ].map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setSettings({ ...settings, quizDifficulty: diff.id })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${settings.quizDifficulty === diff.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground'
                        }`}
                    >
                      <div className="font-medium text-foreground mb-1">{diff.label}</div>
                      <div className="text-xs text-muted-foreground">{diff.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 考查侧重点 */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold mb-1 text-foreground">考查侧重点</h3>
                <p className="text-sm text-muted-foreground mb-4">选择 AI 出题时侧重考查的方向（可多选）</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'concept', label: '📖 概念理解', desc: '考查定义和核心概念' },
                    { id: 'compare', label: '🔄 对比分析', desc: '考查概念间的异同' },
                    { id: 'apply', label: '💡 实际应用', desc: '考查知识在实际场景中的应用' },
                    { id: 'process', label: '📋 流程步骤', desc: '考查流程和操作步骤' },
                  ].map((focus) => (
                    <button
                      key={focus.id}
                      onClick={() => toggleFocus(focus.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${settings.quizFocus.includes(focus.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground'
                        }`}
                    >
                      <div className="font-medium text-foreground mb-1">{focus.label}</div>
                      <div className="text-xs text-muted-foreground">{focus.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 自定义出题指令 */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold mb-1 text-foreground">自定义出题指令</h3>
                <p className="text-sm text-muted-foreground mb-4">给 AI 出题官额外的补充要求（可选）</p>
                <textarea
                  value={settings.quizCustomInstruction}
                  onChange={(e) =>
                    setSettings({ ...settings, quizCustomInstruction: e.target.value })
                  }
                  placeholder="例如：侧重考查 RAG 检索部分的知识点；多出关于向量数据库的题..."
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ===== 批改设置 Section ===== */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="size-5 text-success" />
              <h2 className="text-lg font-semibold text-foreground">AI 批改官设置</h2>
            </div>

            <div className="space-y-4">

              {/* 批改严格程度 */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold mb-1 text-foreground">批改严格程度</h3>
                <p className="text-sm text-muted-foreground mb-4">控制 AI 批改问答题时的评判标准</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'lenient', label: '🟢 宽松', desc: '答到大意即算正确' },
                    { id: 'medium', label: '🟡 适中', desc: '需覆盖主要得分点' },
                    { id: 'strict', label: '🔴 严格', desc: '必须准确覆盖所有要点' },
                  ].map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setSettings({ ...settings, gradingStrictness: level.id })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${settings.gradingStrictness === level.id
                        ? 'border-success bg-success/10'
                        : 'border-border hover:border-muted-foreground'
                        }`}
                    >
                      <div className="font-medium text-foreground mb-1">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 反馈风格 */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold mb-1 text-foreground">反馈风格</h3>
                <p className="text-sm text-muted-foreground mb-4">AI 批改时给学生反馈的语气风格</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'encouraging', label: '💪 鼓励型', desc: '多表扬，积极引导' },
                    { id: 'objective', label: '📊 客观型', desc: '就事论事，中立评价' },
                    { id: 'strict', label: '📐 严厉型', desc: '高标准，严要求' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSettings({ ...settings, gradingStyle: style.id })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${settings.gradingStyle === style.id
                        ? 'border-success bg-success/10'
                        : 'border-border hover:border-muted-foreground'
                        }`}
                    >
                      <div className="font-medium text-foreground mb-1">{style.label}</div>
                      <div className="text-xs text-muted-foreground">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 及格线 + 展示答案 */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold mb-4 text-foreground">评分规则</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block mb-2">
                      <span className="font-medium text-foreground">及格分数</span>
                      <span className="text-sm text-muted-foreground ml-2">满分 100</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={settings.passingScore}
                        onChange={(e) =>
                          setSettings({ ...settings, passingScore: parseInt(e.target.value) })
                        }
                        className="flex-1"
                        style={{ accentColor: '#00B894' }}
                      />
                      <div className="flex-none w-16 text-center">
                        <div className="text-2xl font-bold text-success">{settings.passingScore}</div>
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
                        type="checkbox"
                        checked={settings.showAnswer}
                        onChange={(e) =>
                          setSettings({ ...settings, showAnswer: e.target.checked })
                        }
                        className="size-5 rounded"
                        style={{ accentColor: '#00B894' }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 自定义批改指令 */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold mb-1 text-foreground">自定义批改指令</h3>
                <p className="text-sm text-muted-foreground mb-4">给 AI 批改官额外的补充要求（可选）</p>
                <textarea
                  value={settings.gradingCustomInstruction}
                  onChange={(e) =>
                    setSettings({ ...settings, gradingCustomInstruction: e.target.value })
                  }
                  placeholder="例如：重点关注学生是否理解了核心概念；对关键术语的使用要准确..."
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ===== 通用设置 Section ===== */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">通用设置</h2>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div>
                <label className="block mb-2">
                  <span className="font-medium text-foreground">答题时限（分钟）</span>
                  <span className="text-sm text-muted-foreground ml-2">0 表示不限时</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="5"
                  value={settings.timeLimit}
                  onChange={(e) =>
                    setSettings({ ...settings, timeLimit: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pb-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 md:flex-none px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}