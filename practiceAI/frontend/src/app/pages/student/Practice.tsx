import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, BookOpen, ChevronRight, RotateCcw, Loader2, Star, Gamepad2, Zap, Trophy, Target } from 'lucide-react';
import { toast } from 'sonner';
import { practiceApi } from '../../api';

interface Question {
  id: number;
  type: 'choice' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  feedback?: string;
}

interface QuizTopic {
  id: number;
  topic_name: string;
  knowledge_base_name: string;
  question_count: number;
  difficulty: string;
}

export default function StudentPractice() {
  const [step, setStep] = useState<'select' | 'practice' | 'result'>('select');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [startingRequired, setStartingRequired] = useState(false);
  const [startingFree, setStartingFree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const startTime = useRef<number>(0);

  // 必修闯关数据
  const [quizTopics, setQuizTopics] = useState<QuizTopic[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<{ id: string; name: string }[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // 自由刷题选项
  const [freeKnowledge, setFreeKnowledge] = useState('');
  const [freeType, setFreeType] = useState('all');
  const [freeCount, setFreeCount] = useState(5);

  // 记录当前练习来源
  const [practiceSource, setPracticeSource] = useState<'required' | 'free'>('free');

  useEffect(() => {
    const load = async () => {
      try {
        const [kbs, qSets] = await Promise.all([
          practiceApi.getKnowledgeBases(),
          practiceApi.getQuestionSets().catch(() => []),
        ]);
        setKnowledgeBases(kbs);
        setQuizTopics(qSets || []);
      } catch {
        setKnowledgeBases([{ id: 'default', name: '默认知识库' }]);
      } finally {
        setLoadingTopics(false);
      }
    };
    load();
  }, []);

  const getKBName = (id: string) => {
    return knowledgeBases.find((kb) => kb.id === id)?.name || id;
  };

  // 必修闯关 - 从教师预生成题库启动（不调用 LLM，瞬间开始）
  const startRequiredPractice = async (topic: QuizTopic) => {
    setStartingRequired(true);
    setPracticeSource('required');
    try {
      const session = await practiceApi.startFromSet(topic.id);
      setSessionId(session.session_id);
      const qs: Question[] = (session.questions || []).map((q: any) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        userAnswer: undefined,
        isCorrect: undefined,
      }));
      setQuestions(qs);
      setCurrentQuestionIndex(0);
      startTime.current = Date.now();
      setStep('practice');
    } catch (err: any) {
      toast.error(err.message || '开始练习失败');
    } finally {
      setStartingRequired(false);
    }
  };

  // 自由刷题 - 启动
  const startFreePractice = async () => {
    setStartingFree(true);
    setPracticeSource('free');
    try {
      const session = await practiceApi.startSession({
        knowledge_base: freeKnowledge || undefined,
        question_type: freeType !== 'all' ? freeType : undefined,
        question_count: freeCount,
      });
      setSessionId(session.session_id);
      const qs: Question[] = (session.questions || []).map((q: any) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        userAnswer: undefined,
        isCorrect: undefined,
      }));
      setQuestions(qs);
      setCurrentQuestionIndex(0);
      startTime.current = Date.now();
      setStep('practice');
    } catch (err: any) {
      toast.error(err.message || '开始练习失败');
    } finally {
      setStartingFree(false);
    }
  };

  const handleChoiceAnswer = (optionIndex: number) => {
    const updatedQuestions = [...questions];
    const opt = updatedQuestions[currentQuestionIndex].options?.[optionIndex];
    updatedQuestions[currentQuestionIndex].userAnswer = opt ?? String(optionIndex);
    setQuestions(updatedQuestions);
  };

  const handleEssayAnswer = (answer: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].userAnswer = answer;
    setQuestions(updatedQuestions);
  };

  const submitAnswer = async () => {
    if (!sessionId) return;
    const currentQ = questions[currentQuestionIndex];
    if (currentQ.userAnswer === undefined) return;

    setSubmitting(true);
    try {
      const response = await practiceApi.submitAnswer(sessionId, {
        question_id: currentQ.id,
        user_answer: String(currentQ.userAnswer),
      });
      const updatedQuestions = [...questions];
      updatedQuestions[currentQuestionIndex].isCorrect = response.is_correct;
      updatedQuestions[currentQuestionIndex].correctAnswer = response.correct_answer;
      updatedQuestions[currentQuestionIndex].explanation = response.explanation;
      updatedQuestions[currentQuestionIndex].feedback = response.feedback;
      setQuestions(updatedQuestions);
    } catch (err: any) {
      toast.error(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      if (sessionId) {
        try {
          const duration = Math.round((Date.now() - startTime.current) / 1000);
          await practiceApi.finishSession(sessionId, duration);
          const res = await practiceApi.getResult(sessionId);
          setResult(res);
        } catch {
          // still show local result
        }
      }
      setStep('result');
    }
  };

  const resetPractice = () => {
    setStep('select');
    setCurrentQuestionIndex(0);
    setQuestions([]);
    setSessionId(null);
    setResult(null);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const hasAnswered = currentQuestion?.isCorrect !== undefined;

  // ==================== SELECT STEP ====================
  if (step === 'select') {
    return (
      <div className="size-full overflow-auto pb-20 md:pb-0 bg-[#FFFDF5] relative">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#FDE047] rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob pointer-events-none"></div>
        <div className="max-w-4xl mx-auto p-6 md:p-8 relative z-10">
          <div className="mb-12 border-b-4 border-black pb-4">
            <h1 className="text-5xl md:text-6xl font-black font-[Syne] tracking-wider mb-1 text-slate-900 uppercase">练习 <span className="text-outline text-[#2563EB]">专区</span></h1>
            <p className="text-lg font-black font-mono uppercase tracking-widest text-slate-500">选择您的挑战模式</p>
          </div>

          {/* ===== 必修闯关 Section ===== */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6 bg-[#FDE047] w-fit px-4 py-2 border-4 border-black neo-shadow-sm rounded-2xl group hover:neo-shadow hover:-translate-y-1 transition-all">
              <Star className="size-6 text-black group-hover:rotate-12 transition-transform" strokeWidth={3} />
              <h2 className="text-2xl font-black uppercase tracking-widest text-black">必 修 闯 关</h2>
            </div>

            {loadingTopics ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="size-6 animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : quizTopics.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <Trophy className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">暂无必修闯关</p>
                <p className="text-muted-foreground/60 text-xs mt-1">教师尚未配置必修主题</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {quizTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-amber-300 transition-all group overflow-hidden"
                  >
                    {/* 顶部装饰条 */}
                    <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400" />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {topic.topic_name || `主题 ${index + 1}`}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                          <Zap className="size-3" />
                          {topic.question_count} 题
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <BookOpen className="size-3.5" />
                        <span>知识库: {topic.knowledge_base_name || '全部知识库'}</span>
                      </div>

                      <button
                        onClick={() => startRequiredPractice(topic)}
                        disabled={startingRequired}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                      >
                        {startingRequired ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Target className="size-4" />
                        )}
                        {startingRequired ? '加载中...' : '开始闯关'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== 自由刷题 Section ===== */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Gamepad2 className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">自由刷题</h2>
              <span className="text-xs text-muted-foreground ml-1">自主选择知识库和题型</span>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              {/* 知识库选择 */}
              <div className="mb-5">
                <label className="block font-medium mb-2 text-sm text-foreground">选择知识库</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {knowledgeBases.map((kb) => (
                    <button
                      key={kb.id}
                      onClick={() => setFreeKnowledge(kb.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all text-sm ${freeKnowledge === kb.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-muted-foreground text-foreground'
                        }`}
                    >
                      {kb.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 题型和题数 */}
              <div className="grid md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block font-medium mb-2 text-sm text-foreground">题型</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: '全部' },
                      { id: 'choice', label: '选择题' },
                      { id: 'essay', label: '问答题' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setFreeType(type.id)}
                        className={`flex-1 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${freeType === type.id
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-border text-foreground hover:border-muted-foreground'
                          }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm text-foreground">题目数量</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="3"
                      max="20"
                      value={freeCount}
                      onChange={(e) => setFreeCount(parseInt(e.target.value))}
                      className="flex-1"
                      style={{ accentColor: '#FDE047' }}
                    />
                    <span className="text-lg font-bold text-black w-8 text-center">{freeCount}</span>
                    <span className="text-sm text-muted-foreground">题</span>
                  </div>
                </div>
              </div>

              {/* 开始按钮 */}
              <button
                onClick={startFreePractice}
                disabled={!freeKnowledge || startingFree}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                {startingFree ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Gamepad2 className="size-4" />
                )}
                {startingFree ? '生成题目中...' : '开始刷题'}
                {!startingFree && <ChevronRight className="size-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== PRACTICE STEP ====================
  if (step === 'practice' && currentQuestion) {
    return (
      <div className="size-full overflow-auto pb-20 md:pb-0 bg-[#FFF8F0]">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                题目 {currentQuestionIndex + 1} / {questions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full ${practiceSource === 'required'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
                  }`}>
                  {practiceSource === 'required' ? '⭐ 必修闯关' : '🎮 自由刷题'}
                </span>
                <span className="text-sm px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                  {currentQuestion.type === 'choice' ? '选择题' : '问答题'}
                </span>
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-6 md:p-8 mb-6">
            <h2 className="text-lg md:text-xl font-medium mb-6 text-gray-900">
              {currentQuestion.question}
            </h2>

            {currentQuestion.type === 'choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = currentQuestion.userAnswer === option;
                  const isCorrect = currentQuestion.correctAnswer === option;
                  const showResult = hasAnswered;

                  return (
                    <button
                      key={index}
                      onClick={() => !hasAnswered && handleChoiceAnswer(index)}
                      disabled={hasAnswered}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${showResult && isCorrect
                        ? 'border-emerald-500 bg-emerald-50'
                        : showResult && isSelected && !isCorrect
                          ? 'border-red-500 bg-red-50'
                          : isSelected
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        } ${hasAnswered ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-none size-6 rounded-full border-2 flex items-center justify-center ${showResult && isCorrect
                            ? 'border-emerald-500 bg-emerald-500'
                            : showResult && isSelected && !isCorrect
                              ? 'border-red-500 bg-red-500'
                              : isSelected
                                ? 'border-amber-500 bg-amber-500'
                                : 'border-gray-300'
                            }`}
                        >
                          {showResult && isCorrect && (
                            <CheckCircle2 className="size-4 text-white" />
                          )}
                          {showResult && isSelected && !isCorrect && (
                            <XCircle className="size-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">{option}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'essay' && (
              <div>
                <textarea
                  value={(currentQuestion.userAnswer as string) || ''}
                  onChange={(e) => !hasAnswered && handleEssayAnswer(e.target.value)}
                  disabled={hasAnswered}
                  placeholder="请输入您的答案..."
                  className="w-full h-40 p-4 border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none disabled:bg-gray-50 shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Result */}
          {hasAnswered && (
            <div
              className={`rounded-2xl p-6 mb-6 shadow-sm ${currentQuestion.isCorrect
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
                }`}
            >
              <div className="flex items-start gap-3 mb-3">
                {currentQuestion.isCorrect ? (
                  <CheckCircle2 className="size-6 text-emerald-600 flex-none" />
                ) : (
                  <XCircle className="size-6 text-red-600 flex-none" />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-medium mb-2 ${currentQuestion.isCorrect ? 'text-emerald-900' : 'text-red-900'
                      }`}
                  >
                    {currentQuestion.isCorrect ? '回答正确！' : '回答错误'}
                  </h3>
                  {currentQuestion.explanation && (
                    <p className="text-gray-700 mb-2">
                      <span className="font-medium">解析：</span>
                      {currentQuestion.explanation}
                    </p>
                  )}
                  {currentQuestion.feedback && (
                    <p className="text-gray-700">
                      <span className="font-medium">AI 反馈：</span>
                      {currentQuestion.feedback}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {!hasAnswered ? (
              <button
                onClick={submitAnswer}
                disabled={currentQuestion.userAnswer === undefined || submitting}
                className="flex-1 px-8 py-3 bg-[#00B894] text-white rounded-xl hover:bg-[#00A583] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? '提交中...' : '提交答案'}
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="flex-1 px-8 py-3 bg-[#00B894] text-white rounded-xl hover:bg-[#00A583] transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {currentQuestionIndex < questions.length - 1 ? '下一题' : '查看结果'}
                <ChevronRight className="size-4" />
              </button>
            )}
            <button
              onClick={() => setStep('select')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RESULT STEP ====================
  if (step === 'result') {
    const correctCount = result?.correct_count ?? questions.filter((q) => q.isCorrect).length;
    const totalCount = result?.total_questions ?? questions.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    return (
      <div className="size-full overflow-auto pb-20 md:pb-0 bg-[#FFF8F0]">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="text-center mb-8">
            <div className="size-20 md:size-24 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              {practiceSource === 'required' ? (
                <Trophy className="size-10 md:size-12 text-white" />
              ) : (
                <BookOpen className="size-10 md:size-12 text-white" />
              )}
            </div>
            <h1 className="text-3xl md:text-4xl mb-2 text-gray-900">
              {practiceSource === 'required' ? '闯关完成！' : '练习完成！'}
            </h1>
            <p className="text-gray-600">
              {practiceSource === 'required' ? '恭喜您完成本次必修闯关' : '恭喜您完成本次自由刷题'}
            </p>
          </div>

          {/* Score */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-8 mb-6 text-center border border-amber-100/50 shadow-sm">
            <div className="text-6xl text-amber-600 mb-2">{accuracy}%</div>
            <div className="text-gray-600">
              正确 {correctCount} / {totalCount} 题
            </div>
          </div>

          {/* Question Review */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-6 mb-6">
            <h3 className="font-semibold mb-4 text-gray-900">答题详情</h3>
            <div className="space-y-3">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <span className="text-sm text-gray-900">第 {index + 1} 题</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 px-2.5 py-1 bg-white rounded-full">
                      {q.type === 'choice' ? '选择题' : '问答题'}
                    </span>
                    {q.isCorrect ? (
                      <CheckCircle2 className="size-5 text-emerald-600" />
                    ) : (
                      <XCircle className="size-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={resetPractice}
              className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <RotateCcw className="size-5" />
              再练一次
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}