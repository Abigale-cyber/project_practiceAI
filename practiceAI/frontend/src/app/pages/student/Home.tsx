import { Link } from 'react-router';
import { MessageSquare, BookOpen, TrendingUp, Award } from 'lucide-react';
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
        // 取最近 5 条作为活动
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
    { label: '已完成练习', value: stats?.practice_count ?? '-' },
    { label: '平均分数', value: stats?.average_score ? `${stats.average_score}%` : '-' },
    { label: '提问次数', value: stats?.chat_count ?? '-' },
  ];

  return (
    <div className="size-full overflow-auto pb-20 md:pb-0 bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl mb-1 text-foreground">欢迎回来！</h1>
          <p className="text-sm text-muted-foreground">继续您的学习之旅</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-card rounded-lg p-5 shadow-sm border border-border">
              <div className="text-3xl mb-1 text-foreground">
                {loading ? '...' : stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Link
            to="/chat"
            onMouseEnter={() => setHoveredCard('chat')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`rounded-lg p-8 transition-all ${hoveredCard === 'chat'
              ? 'bg-[#00B894] shadow-lg scale-[1.02]'
              : 'bg-[#00B894] shadow-md'
              }`}
          >
            <h3 className="text-xl font-medium mb-2 text-white">智能问答</h3>
            <p className="text-sm text-white/90">基于知识库随时提问，获得即时解答</p>
          </Link>
          <Link
            to="/practice"
            onMouseEnter={() => setHoveredCard('practice')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`rounded-lg p-8 border-2 transition-all ${hoveredCard === 'practice'
              ? 'bg-[#00B894] border-[#00B894] shadow-lg scale-[1.02]'
              : 'bg-card border-border shadow-sm'
              }`}
          >
            <h3 className={`text-xl font-medium mb-2 ${hoveredCard === 'practice' ? 'text-white' : 'text-foreground'
              }`}>
              开始练习
            </h3>
            <p className={`text-sm ${hoveredCard === 'practice' ? 'text-white/90' : 'text-muted-foreground'
              }`}>
              选择题与问答题练习，巩固所学知识
            </p>
          </Link>
        </div>

        {/* Recent Activities */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-medium text-foreground">最近练习</h2>
          </div>
          <div className="divide-y divide-border">
            {!loading && activities.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                暂无练习记录，开始第一次练习吧！
              </div>
            )}
            {activities.map((activity, index) => (
              <div key={index} className="p-5 hover:bg-muted transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded bg-[#00B894] text-white">
                        {activity.question_type || '练习'}
                      </span>
                      {activity.score > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-foreground">
                          {activity.score}分
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium mb-1 truncate text-foreground">
                      {activity.knowledge_base || '综合练习'} · {activity.total_questions}题
                    </h3>
                    <p className="text-sm text-muted-foreground">{activity.created_at}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}