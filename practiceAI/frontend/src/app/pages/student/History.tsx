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
    if (!seconds) return '0分钟';
    const mins = Math.round(seconds / 60);
    return `${mins}分钟`;
  };

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="size-full overflow-auto pb-20 md:pb-0 bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl mb-1 text-foreground">历史记录</h1>
          <p className="text-sm text-muted-foreground">查看您的练习和问答历史</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-4 py-2 border-b-2 transition-colors text-sm ${activeTab === 'practice'
                ? 'border-success text-success'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="size-4" />
              <span>练习记录</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 border-b-2 transition-colors text-sm ${activeTab === 'chat'
                ? 'border-success text-success'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              <span>问答记录</span>
            </div>
          </button>
        </div>

        {/* Practice History */}
        {activeTab === 'practice' && (
          <div className="space-y-4">
            {practiceHistory.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">暂无练习记录</div>
            )}
            {practiceHistory.map((item: any) => (
              <div
                key={item.session_id}
                className="bg-card rounded-lg shadow-sm border border-border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-base mb-2 text-foreground">
                      {item.knowledge_base || '综合练习'}
                      {item.question_type ? ` - ${item.question_type === 'choice' ? '选择题' : '问答题'}` : ''}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-4" />
                        <span>{item.created_at?.slice(0, 10) || ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="size-4" />
                        <span>{item.total_questions || 0} 题</span>
                      </div>
                      <div>用时：{formatDuration(item.duration)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl text-success">{item.score ?? 0}</div>
                      <div className="text-xs text-muted-foreground">分数</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
                <div className="text-2xl mb-1 text-foreground">
                  {stats?.total_practices ?? practiceHistory.length}
                </div>
                <div className="text-sm text-muted-foreground">练习次数</div>
              </div>
              <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
                <div className="text-2xl text-success mb-1">
                  {stats?.average_score != null ? `${Math.round(stats.average_score)}%` : '—'}
                </div>
                <div className="text-sm text-muted-foreground">平均正确率</div>
              </div>
              <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
                <div className="text-2xl mb-1 text-foreground">
                  {stats?.total_questions ?? 0}
                </div>
                <div className="text-sm text-muted-foreground">完成题目</div>
              </div>
              <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
                <div className="text-2xl mb-1 text-foreground">
                  {stats?.total_duration != null ? Math.round(stats.total_duration / 60) : 0}
                </div>
                <div className="text-sm text-muted-foreground">累计用时(分)</div>
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">暂无问答记录</div>
            )}
            {chatHistory.map((item: any) => (
              <div
                key={item.session_id || item.id}
                className="bg-card rounded-lg shadow-sm border border-border p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base mb-2 text-foreground">
                      {item.title || '对话'}
                    </h3>
                    {item.preview && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {item.preview}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>{item.created_at?.slice(0, 10) || ''}</span>
                      </div>
                      {item.message_count != null && <div>{item.message_count} 条消息</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}