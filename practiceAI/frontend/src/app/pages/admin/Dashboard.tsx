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
      label: '学员总数',
      value: stats?.student_count ?? 0,
      icon: Users,
      gradient: 'from-blue-300 to-sky-200',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-400',
    },
    {
      label: '题库题目',
      value: stats?.question_count ?? 0,
      icon: FileQuestion,
      gradient: 'from-violet-300 to-purple-200',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-400',
    },
    {
      label: '知识库文档',
      value: stats?.document_count ?? 0,
      icon: Database,
      gradient: 'from-emerald-300 to-teal-200',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-400',
    },
    {
      label: '平均分数',
      value: stats?.average_score ?? 0,
      icon: TrendingUp,
      gradient: 'from-amber-300 to-orange-200',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-400',
    },
  ];

  return (
    <div className="size-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header with gradient accent */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-primary/70 to-emerald-300 rounded-xl">
              <Activity className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">数据总览</h1>
              <p className="text-sm text-muted-foreground">查看平台整体运营情况</p>
            </div>
          </div>
        </div>

        {/* Stats Grid - with gradient icons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                    <Icon className="size-3.5 text-white" />
                  </div>
                  <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${stat.bgLight} ${stat.textColor}`}>
                    {stat.label}
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {loading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Activities */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-5 border-b border-border flex items-center gap-2">
              <Flame className="size-5 text-orange-300" />
              <h2 className="text-lg font-semibold text-foreground">最近活动</h2>
            </div>
            <div className="divide-y divide-border">
              {activities.length === 0 && !loading && (
                <div className="p-8 text-center">
                  <BookOpen className="size-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">暂无活动记录</p>
                </div>
              )}
              {activities.map((activity, index) => (
                <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-none size-9 rounded-full bg-primary flex items-center justify-center">
                      <BookOpen className="size-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-foreground">{activity.user}</span>
                        {activity.score > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-500 rounded-full font-medium">
                            🏅 {activity.score}分
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{activity.created_at}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Questions */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-5 border-b border-border flex items-center gap-2">
              <Award className="size-5 text-violet-300" />
              <h2 className="text-lg font-semibold text-foreground">热门问题</h2>
            </div>
            <div className="p-5 space-y-3">
              {popular.length === 0 && !loading && (
                <div className="py-8 text-center">
                  <Award className="size-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">暂无数据</p>
                </div>
              )}
              {popular.map((item, index) => {
                const rankColors = [
                  'from-amber-300 to-orange-300',
                  'from-slate-300 to-slate-350',
                  'from-amber-400 to-yellow-400',
                  'from-gray-250 to-gray-300',
                  'from-gray-250 to-gray-300',
                ];
                return (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`flex-none size-8 rounded-lg bg-gradient-to-br ${rankColors[index] || rankColors[3]} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-2">{item.question}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 bg-violet-50 text-violet-400 rounded-full">{item.type}</span>
                        <span>{item.attempt_count} 次练习</span>
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