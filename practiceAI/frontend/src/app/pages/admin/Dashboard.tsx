import { Users, BookOpen, TrendingUp, Database, FileQuestion, Activity, Award, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminApi } from '../../api';

interface DashboardStats {
  student_count: number;
  question_count: number;
  document_count: number;
  practice_count: number;
  average_score: number;
}

interface ActivityItem {
  type: string;
  user: string;
  description: string;
  score: number;
  created_at: string;
}

interface PopularQuestion {
  id: number;
  question: string;
  type: string;
  attempt_count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [popular, setPopular] = useState<PopularQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, a, p] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getRecentActivities(5),
          adminApi.getPopularQuestions(5),
        ]);
        setStats(s);
        setActivities(a);
        setPopular(p);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statCards = [
    {
      label: '学 员 总 数',
      value: stats?.student_count ?? 0,
      icon: Users,
      color: 'bg-[#FDE047]'
    },
    {
      label: '题 库 题 目',
      value: stats?.question_count ?? 0,
      icon: FileQuestion,
      color: 'bg-[#F9A8D4]'
    },
    {
      label: '知 识 库 文 档',
      value: stats?.document_count ?? 0,
      icon: Database,
      color: 'bg-[#2563EB]',
      textWhite: true
    },
    {
      label: '平 均 分 数',
      value: stats?.average_score ?? 0,
      icon: TrendingUp,
      color: 'bg-[#FFFDF5]'
    },
  ];

  return (
    <div className="size-full overflow-auto bg-[#FFFDF5]">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 font-[Syne] leading-none mb-1 md:mb-2 hover:-skew-x-2 transition-transform duration-500 cursor-default">
              数 据 <br /><span className="text-[#F9A8D4] text-outline">总 览</span>
            </h1>
          </div>
          <p className="text-sm md:text-lg font-black text-slate-500 max-w-sm mt-3 md:mt-0 text-right uppercase tracking-widest hidden md:block border-r-4 border-black pr-4 leading-relaxed">
            查看平台整体运营情况 <br /> 与学员练习动态。
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 md:border-4 border-black neo-shadow-sm hover:-translate-y-1 hover:neo-shadow transition-all duration-300 group cursor-default flex flex-col justify-between
                  ${stat.color} ${stat.textWhite ? 'text-white' : 'text-slate-900'}
                `}
              >
                <div className="flex justify-between items-start mb-4 md:mb-6">
                  <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl border-2 md:border-4 border-black bg-white group-hover:scale-110 transition-transform ${stat.textWhite ? 'text-black' : ''}`}>
                    <Icon className="size-5 md:size-6" strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-5xl font-black mb-1 md:mb-2 leading-none">
                    {loading ? '...' : stat.value}
                  </div>
                  <div className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-90">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12">
          {/* Recent Activities */}
          <div className="bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black neo-shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 md:p-6 border-b-2 md:border-b-4 border-black flex items-center justify-between bg-[#FDE047]">
              <div className="flex items-center gap-2 md:gap-3">
                <Flame className="size-6 md:size-8 text-black" strokeWidth={3} />
                <h2 className="text-lg md:text-2xl font-black text-black tracking-widest">最 近 活 动</h2>
              </div>
            </div>
            <div className="divide-y-2 md:divide-y-4 divide-black flex-1">
              {activities.length === 0 && !loading && (
                <div className="p-8 md:p-12 text-center text-slate-500 text-xs md:text-sm font-black tracking-widest font-mono">
                  [ 暂 无 活 动 记 录 ]
                </div>
              )}
              {activities.map((activity, index) => (
                <div key={index} className="p-4 md:p-6 hover:bg-black/5 transition-colors group">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="flex-none size-10 md:size-12 rounded-xl md:rounded-2xl border-2 md:border-4 border-black bg-[#2563EB] flex items-center justify-center neo-shadow-sm group-hover:scale-110 transition-transform">
                      <BookOpen className="size-5 md:size-6 text-white" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                        <span className="font-black text-base md:text-lg text-slate-900">{activity.user}</span>
                        {activity.score > 0 && (
                          <span className="text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 bg-black text-white rounded-full font-black tracking-widest uppercase">
                            {activity.score} 分
                          </span>
                        )}
                      </div>
                      <p className="text-sm md:text-base font-bold text-slate-600 mb-1.5 md:mb-2 leading-tight">{activity.description}</p>
                      <p className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 font-mono">{activity.created_at}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Questions */}
          <div className="bg-white rounded-2xl md:rounded-3xl border-2 md:border-4 border-black neo-shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 md:p-6 border-b-2 md:border-b-4 border-black flex items-center justify-between bg-[#F9A8D4]">
              <div className="flex items-center gap-2 md:gap-3">
                <Award className="size-6 md:size-8 text-black" strokeWidth={3} />
                <h2 className="text-lg md:text-2xl font-black text-black tracking-widest">热 门 问 题</h2>
              </div>
            </div>
            <div className="divide-y-2 md:divide-y-4 divide-black flex-1">
              {popular.length === 0 && !loading && (
                <div className="p-8 md:p-12 text-center text-slate-500 text-xs md:text-sm font-black tracking-widest font-mono">
                  [ 暂 无 数 据 ]
                </div>
              )}
              {popular.map((item, index) => {
                const colors = ['bg-[#FDE047]', 'bg-slate-200', 'bg-[#F9A8D4]', 'bg-white', 'bg-white'];
                const rankColor = colors[index] || 'bg-white';

                return (
                  <div key={index} className="flex items-start gap-3 md:gap-4 p-4 md:p-6 hover:bg-black/5 transition-colors group">
                    <div className={`flex-none size-10 md:size-12 rounded-xl md:rounded-2xl border-2 md:border-4 border-black ${rankColor} flex items-center justify-center text-lg md:text-xl font-black text-black neo-shadow-sm group-hover:scale-110 transition-transform`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-black text-base md:text-lg text-slate-900 mb-1.5 md:mb-2 line-clamp-2 leading-tight">{item.question}</h3>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm font-black tracking-widest">
                        <span className="px-2 md:px-3 py-0.5 md:py-1 bg-black text-white rounded-full border-2 border-black">{item.type}</span>
                        <span className="text-slate-500 bg-white border-2 border-black px-2 md:px-3 py-0.5 md:py-1 rounded-full">{item.attempt_count} 次练习</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}