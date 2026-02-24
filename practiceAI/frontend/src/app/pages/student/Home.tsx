import { Link } from 'react-router';
import { MessageSquare, BookOpen, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { historyApi } from '../../api';

export default function StudentHome() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, history] = await Promise.all([
          historyApi.getStudentStats(),
          historyApi.getPracticeHistory(),
        ]);
        setStats(s);
        setActivities((history || []).slice(0, 5));
      } catch (err) {
        console.error('Home load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statCards = [
    { label: '已完成模块', value: stats?.practice_count ?? '-', icon: BookOpen, color: 'bg-[#FDE047]' },
    { label: '均分', value: stats?.average_score ? `${stats.average_score}%` : '-', icon: TrendingUp, color: 'bg-[#F9A8D4]' },
    { label: '答疑数', value: stats?.chat_count ?? '-', icon: MessageSquare, color: 'bg-[#2563EB]', textWhite: true },
  ];

  return (
    <div className="size-full overflow-auto pb-24 md:pb-0 bg-[#FFFDF5] relative">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#FDE047] rounded-full mix-blend-multiply blur-[80px] opacity-40 animate-blob pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-8">
        {/* Welcome Section - Mobile optimized */}
        <div className="mb-6 md:mb-12 flex flex-col md:flex-row items-start md:items-end justify-between">
          <div>
            <span className="text-base md:text-2xl font-black font-[Space_Grotesk] bg-black text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl -rotate-2 inline-block mb-2 md:mb-3 neo-shadow-sm border-2 border-black tracking-widest">
              你好！
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 font-[Syne] leading-none mb-1 md:mb-2 hover:-skew-x-2 transition-transform duration-500 cursor-default">
              AI金牌 <span className="text-[#2563EB] text-outline">导师</span>
            </h1>
          </div>
          <p className="text-sm md:text-lg font-black text-slate-500 max-w-sm mt-3 md:mt-0 md:text-right uppercase tracking-wider hidden md:block border-r-4 border-black pr-4 leading-relaxed">
            追踪学习进度， <br /> 挑战更高目标， <br /> 快速掌握新知识。
          </p>
        </div>

        {/* Marquee Separator - thinner on mobile */}
        <div className="w-full bg-black py-2 md:py-3 overflow-hidden border-y-2 md:border-y-4 border-black rotate-1 scale-105 z-20 relative mb-8 md:mb-16">
          <div className="whitespace-nowrap flex animate-marquee">
            <span className="text-sm md:text-xl font-black text-[#FDE047] mx-3 md:mx-6 tracking-widest">持续学习</span>
            <span className="text-sm md:text-xl font-black text-white mx-3 md:mx-6 tracking-widest">✦</span>
            <span className="text-sm md:text-xl font-black text-[#F9A8D4] mx-3 md:mx-6 tracking-widest">AI驱动</span>
            <span className="text-sm md:text-xl font-black text-white mx-3 md:mx-6 tracking-widest">✦</span>
            <span className="text-sm md:text-xl font-black text-[#2563EB] mx-3 md:mx-6 tracking-widest">数据分析</span>
            <span className="text-sm md:text-xl font-black text-white mx-3 md:mx-6 tracking-widest">✦</span>
            <span className="text-sm md:text-xl font-black text-[#FDE047] mx-3 md:mx-6 tracking-widest">持续学习</span>
            <span className="text-sm md:text-xl font-black text-white mx-3 md:mx-6 tracking-widest">✦</span>
            <span className="text-sm md:text-xl font-black text-[#F9A8D4] mx-3 md:mx-6 tracking-widest">AI驱动</span>
            <span className="text-sm md:text-xl font-black text-white mx-3 md:mx-6 tracking-widest">✦</span>
          </div>
        </div>

        {/* Core Actions Section */}
        <div className="mb-12 md:mb-16">
          <div className="flex items-end justify-between mb-4 md:mb-6 border-b-2 md:border-b-4 border-black pb-2 md:pb-3">
            <h2 className="text-xl md:text-3xl font-black tracking-widest text-slate-900">
              核 心 功 能
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 relative">
            <Link
              to="/chat"
              onMouseEnter={() => setHoveredCard('chat')}
              onMouseLeave={() => setHoveredCard(null)}
              className="group relative w-full block"
            >
              <div className="absolute inset-0 bg-[#2563EB] rounded-2xl md:rounded-3xl border-2 md:border-4 border-black transform rotate-1 md:rotate-2 group-hover:rotate-4 transition-transform duration-500 z-0"></div>
              <div className="relative bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black p-5 md:p-6 z-10 transition-transform duration-500 group-hover:-translate-y-2 group-hover:-translate-x-2 flex flex-col h-full bg-cover">
                <div className="flex items-center justify-between mb-4 md:mb-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#2563EB] rounded-xl border-2 md:border-4 border-black flex items-center justify-center neo-shadow-sm group-hover:scale-110 transition-transform">
                    <MessageSquare className="size-5 md:size-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm md:text-base font-black uppercase tracking-widest text-[#2563EB]">
                    问 答 <ArrowRight className="size-4 md:size-5 group-hover:translate-x-1.5 transition-transform" strokeWidth={3} />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-1.5 md:mb-2 text-slate-900 tracking-wider">AI 辅 导</h3>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-bold">向知识库提问，获取即时的详细解析反馈和智能辅导。</p>

                <div className="mt-4 flex gap-2">
                  <span className="px-2 md:px-3 py-1 bg-black text-white text-[10px] font-bold tracking-widest rounded-full">对 话</span>
                  <span className="px-2 md:px-3 py-1 bg-transparent border-2 border-black text-black text-[10px] font-bold tracking-widest rounded-full">大 模型 驱动</span>
                </div>
              </div>
            </Link>

            <Link
              to="/practice"
              onMouseEnter={() => setHoveredCard('practice')}
              onMouseLeave={() => setHoveredCard(null)}
              className="group relative w-full block"
            >
              <div className="absolute inset-0 bg-[#F9A8D4] rounded-2xl md:rounded-3xl border-2 md:border-4 border-black transform -rotate-1 group-hover:-rotate-3 transition-transform duration-500 z-0"></div>
              <div className="relative bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black p-5 md:p-6 z-10 transition-transform duration-500 group-hover:-translate-y-2 group-hover:translate-x-2 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 md:mb-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#F9A8D4] rounded-xl border-2 md:border-4 border-black flex items-center justify-center neo-shadow-sm group-hover:scale-110 transition-transform">
                    <BookOpen className="size-5 md:size-6 text-black" />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm md:text-base font-black uppercase tracking-widest text-[#F9A8D4]">
                    开 始 <ArrowRight className="size-4 md:size-5 group-hover:translate-x-1.5 transition-transform" strokeWidth={3} />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-1.5 md:mb-2 text-slate-900 tracking-wider">闯 关 练 习</h3>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-bold">选择题、主观题双管齐下，实时打分评估你的知识掌握度。</p>

                <div className="mt-4 flex gap-2">
                  <span className="px-2 md:px-3 py-1 bg-black text-white text-[10px] font-bold tracking-widest rounded-full">测 验</span>
                  <span className="px-2 md:px-3 py-1 bg-[#FDE047] border-2 border-black text-black text-[10px] font-bold tracking-widest rounded-full">计 分</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Stats Section with Theme */}
        <div className="mb-12 md:mb-16">
          <div className="flex items-end justify-between mb-4 md:mb-6 border-b-2 md:border-b-4 border-black pb-2 md:pb-3">
            <h2 className="text-xl md:text-3xl font-black tracking-widest text-slate-900">
              数 据 概 览
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className={`p-3 md:p-5 rounded-xl md:rounded-2xl border-2 md:border-4 border-black neo-shadow-sm hover:-translate-y-1 hover:neo-shadow transition-all duration-300 group cursor-default flex flex-col justify-between
                    ${stat.color} ${stat.textWhite ? 'text-white' : 'text-slate-900'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <div className={`p-1.5 md:p-2.5 rounded-lg border-2 border-black bg-white group-hover:scale-110 transition-transform ${stat.textWhite ? 'text-black' : ''}`}>
                      <Icon className="size-4 md:size-5" strokeWidth={3} />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl md:text-4xl font-black leading-none mb-1">
                      {loading ? '...' : stat.value}
                    </div>
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-wider opacity-90">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-4 md:mb-6 border-b-2 md:border-b-4 border-black pb-2 md:pb-3">
            <h2 className="text-xl md:text-3xl font-black tracking-widest text-slate-900">
              最 近 动 态
            </h2>
          </div>

          <div className="bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black neo-shadow-sm overflow-hidden">
            <div className="divide-y-2 md:divide-y-4 divide-black">
              {!loading && activities.length === 0 && (
                <div className="p-8 md:p-12 text-center text-slate-500 text-sm md:text-lg font-black tracking-widest font-mono">
                  [ 暂无记录，快去练习吧 ]
                </div>
              )}
              {activities.map((activity, index) => (
                <div key={index} className="p-4 md:p-8 hover:bg-[#FDE047] transition-colors group cursor-default flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2 md:mb-3">
                      <span className="px-2 md:px-3 py-0.5 md:py-1 bg-black text-white text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full">
                        {activity.question_type || '综合'}
                      </span>
                      {activity.score > 0 && (
                        <span className="px-2 md:px-3 py-0.5 md:py-1 bg-white border md:border-2 border-black text-black text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full neo-shadow-sm">
                          {activity.score} 分
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg md:text-2xl font-bold font-[Syne] uppercase tracking-tight text-slate-900 mb-1 group-hover:translate-x-2 transition-transform">
                      {activity.knowledge_base || '综合练习'}
                    </h3>
                  </div>

                  <div className="text-right flex md:flex-col items-center md:items-end gap-2 md:gap-0">
                    <p className="text-xs md:text-sm font-mono font-bold text-slate-500 md:mb-1 uppercase tracking-wider">{activity.created_at?.slice(0, 10)}</p>
                    <p className="text-sm md:text-lg font-bold font-[Syne] text-black bg-white border md:border-2 border-black px-3 md:px-4 py-0.5 md:py-1 rounded inline-block">
                      {activity.total_questions} 题
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}