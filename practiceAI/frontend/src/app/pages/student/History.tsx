import { useState, useEffect } from 'react';
import { BookOpen, MessageSquare, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { historyApi } from '../../api';

export default function StudentHistory() {
  const [activeTab, setActiveTab] = useState<'practice' | 'chat'>('practice');
  const [practiceHistory, setPracticeHistory] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pHistory, cHistory, s] = await Promise.all([
          historyApi.getPracticeHistory(),
          historyApi.getChatHistory(),
          historyApi.getStudentStats(),
        ]);
        setPracticeHistory(pHistory || []);
        setChatHistory(cHistory || []);
        setStats(s);
      } catch (err: any) {
        toast.error(err.message || '加载历史记录失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 分 钟';
    const mins = Math.round(seconds / 60);
    return `${mins} 分 钟`;
  };

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-[#FFFDF5]">
        <Loader2 className="size-16 animate-spin text-black" strokeWidth={3} />
      </div>
    );
  }

  return (
    <div className="size-full overflow-auto pb-20 md:pb-0 bg-[#FFFDF5] relative">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row items-baseline justify-between gap-4 md:gap-8 border-b-4 md:border-b-8 border-black pb-4 md:pb-6">
            <h1 className="text-4xl md:text-6xl font-black font-[Syne] tracking-tighter text-slate-900 uppercase">
              练习 <br /><span className="text-[#F9A8D4] text-outline">记录</span>
            </h1>
            <p className="text-sm md:text-lg font-black text-slate-500 tracking-widest font-mono text-right max-w-sm">
              回顾过去的闯关测试与辅导记录
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 md:gap-4 mb-8 md:mb-12">
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-4 py-2 md:px-6 md:py-3 border-2 md:border-4 transition-all text-base md:text-lg font-black tracking-widest font-[Syne] rounded-xl md:rounded-2xl ${activeTab === 'practice'
              ? 'border-black bg-[#FDE047] text-black neo-shadow translate-y-[-2px]'
              : 'border-transparent text-slate-500 hover:text-black hover:bg-black/5'
              }`}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <BookOpen className="size-5 md:size-6" strokeWidth={3} />
              <span>测 验 记 录</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 md:px-6 md:py-3 border-2 md:border-4 transition-all text-base md:text-lg font-black tracking-widest font-[Syne] rounded-xl md:rounded-2xl ${activeTab === 'chat'
              ? 'border-black bg-[#2563EB] text-white neo-shadow translate-y-[-2px]'
              : 'border-transparent text-slate-500 hover:text-black hover:bg-black/5'
              }`}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <MessageSquare className="size-5 md:size-6" strokeWidth={3} />
              <span>辅 导 记 录</span>
            </div>
          </button>
        </div>

        {/* Practice History */}
        {activeTab === 'practice' && (
          <div className="space-y-4 md:space-y-6">
            {/* Stats Summary First for Brutalism */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12 p-4 md:p-6 bg-[#F9A8D4] border-2 md:border-4 border-black rounded-2xl md:rounded-3xl neo-shadow-sm">
              <div className="bg-white rounded-xl md:rounded-2xl border-2 md:border-4 border-black p-4 text-center neo-shadow-sm">
                <div className="text-3xl md:text-5xl font-black font-[Syne] mb-1 md:mb-2">{stats?.total_practices ?? practiceHistory.length}</div>
                <div className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-600">总 次 数</div>
              </div>
              <div className="bg-white rounded-xl md:rounded-2xl border-2 md:border-4 border-black p-4 text-center neo-shadow-sm">
                <div className="text-3xl md:text-5xl font-black font-[Syne] mb-1 md:mb-2 text-[#2563EB]">{stats?.average_score != null ? `${Math.round(stats.average_score)}%` : '—'}</div>
                <div className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-600">平 均 分</div>
              </div>
              <div className="bg-white rounded-xl md:rounded-2xl border-2 md:border-4 border-black p-4 text-center neo-shadow-sm">
                <div className="text-3xl md:text-5xl font-black font-[Syne] mb-1 md:mb-2">{stats?.total_questions ?? 0}</div>
                <div className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-600">答 题 数</div>
              </div>
              <div className="bg-white rounded-xl md:rounded-2xl border-2 md:border-4 border-black p-4 text-center neo-shadow-sm">
                <div className="text-3xl md:text-5xl font-black font-[Syne] mb-1 md:mb-2">{stats?.total_duration != null ? Math.round(stats.total_duration / 60) : 0}</div>
                <div className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-600">时 长(分 钟)</div>
              </div>
            </div>

            {practiceHistory.length === 0 && (
              <div className="text-center py-12 md:py-20 text-slate-400 text-sm md:text-base font-black tracking-widest font-mono border-2 md:border-4 border-dashed border-slate-300 rounded-2xl md:rounded-3xl">
                [ 暂 无 练 习 记 录 ]
              </div>
            )}
            {practiceHistory.map((item: any, index) => (
              <div
                key={item.session_id}
                className="bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black p-4 md:p-6 neo-shadow-sm hover:neo-shadow transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2 md:mb-3">
                      {item.question_type && (
                        <span className="px-2 md:px-3 py-1 bg-black text-white text-[10px] md:text-xs font-black tracking-widest rounded-full">
                          {item.question_type === 'choice' ? '选 择 题' : '主 观 题'}
                        </span>
                      )}
                      <span className="px-2 md:px-3 py-1 bg-[#FDE047] border md:border-2 border-black text-black text-[10px] md:text-xs font-black tracking-widest rounded-full neo-shadow-sm">
                        {item.total_questions || 0} 题
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black font-[Syne] uppercase text-slate-900 mb-2 md:mb-3 group-hover:translate-x-1 pl-1 transition-transform">
                      {item.knowledge_base || '综 合 练 习'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm font-black font-mono text-slate-500 uppercase">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Calendar className="size-4" />
                        <span>{item.created_at?.slice(0, 10) || ''}</span>
                      </div>
                      <div>耗 时 / {formatDuration(item.duration)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center md:justify-end min-w-[100px] mt-2 md:mt-0">
                    <div className="text-center p-3 md:p-4 border-2 md:border-4 border-black rounded-xl md:rounded-2xl bg-white neo-shadow-sm group-hover:scale-105 transition-transform w-[90px] md:w-[120px]">
                      <div className="text-3xl md:text-4xl font-black font-[Syne] text-[#F9A8D4]">{item.score ?? 0}</div>
                      <div className="text-[10px] md:text-xs font-black tracking-widest text-slate-600 mt-0.5 md:mt-1">得 分</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chat History */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {chatHistory.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-12 md:py-20 text-slate-400 text-sm md:text-base font-bold tracking-widest font-mono border-2 md:border-4 border-dashed border-slate-300 rounded-2xl md:rounded-3xl">
                [ 暂 无 对 话 记 录 ]
              </div>
            )}
            {chatHistory.map((item: any) => (
              <div
                key={item.session_id || item.id}
                className="bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black p-5 md:p-6 neo-shadow-sm hover:neo-shadow transition-all duration-300 transform hover:-translate-y-1 cursor-default group flex flex-col h-full"
              >
                <div className="mb-4 md:mb-5 flex gap-2">
                  <span className="px-2 md:px-3 py-1 bg-black text-white text-[10px] md:text-xs font-black tracking-widest rounded-full">会 话 窗 口</span>
                  {item.message_count != null && (
                    <span className="px-2 md:px-3 py-1 border md:border-2 border-black bg-blue-100 text-black text-[10px] md:text-xs font-black tracking-widest rounded-full neo-shadow-sm">
                      {item.message_count} 条<br />消 息
                    </span>
                  )}
                </div>
                <h3 className="text-lg md:text-xl font-black font-[Syne] uppercase text-slate-900 mb-3 md:mb-4 flex-1 line-clamp-2">
                  {item.title || '未 命 名 会 话'}
                </h3>
                {
                  item.preview && (
                    <p className="text-xs md:text-sm font-medium text-slate-600 mb-4 md:mb-5 line-clamp-2 bg-slate-50 p-3 md:p-4 border-l-2 md:border-l-4 border-[#2563EB]">
                      "{item.preview}"
                    </p>
                  )
                }
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold font-mono text-slate-500 uppercase mt-auto pt-3 md:pt-4 border-t border-slate-200 border-dashed" >
                  <Calendar className="size-3 md:size-4" />
                  <span>{item.created_at?.slice(0, 10) || ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}