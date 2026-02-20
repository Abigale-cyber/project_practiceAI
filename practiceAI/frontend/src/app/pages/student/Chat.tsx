import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, ChevronDown, Plus, X, Paperclip, BookOpen, Square, RefreshCw, PlayCircle, MessageSquarePlus, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatApi, knowledgeApi } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';

interface Citation {
  id: number;
  source: string;
  text: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  citations?: Citation[];
  suggestedQuestions?: string[];
  timestamp: Date;
  attachedDocs?: string[];
}

interface KBDocument {
  id: number;
  name: string;
  file_type: string;
  status: string;
}

export default function StudentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是基于机构知识库的AI助手。您可以向我提问任何与学习相关的问题，我会为您解答。\n\n💡 **提示**：点击输入框左侧的 **+** 按钮，可引用知识库文档或上传临时文件作为参考。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 历史会话
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // + 菜单 & 文档引用
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [allDocs, setAllDocs] = useState<KBDocument[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<KBDocument[]>([]);
  const [atCursorPos, setAtCursorPos] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 临时文件上传
  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭 + 菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    if (showPlusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlusMenu]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load knowledge base documents for @ mention
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const docs = await knowledgeApi.listDocuments();
        setAllDocs(docs.filter((d: any) => d.status === 'processed'));
      } catch {
        // silent
      }
    };
    loadDocs();
  }, []);

  // 加载历史会话列表
  const loadSessions = async () => {
    try {
      const list = await chatApi.listSessions();
      setSessions(list || []);
    } catch {
      // silent
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // 切换到已有会话
  const switchSession = async (sessionId: string) => {
    if (sessionId === chatSessionId || isLoading) return;
    setChatSessionId(sessionId);
    try {
      const msgs = await chatApi.getMessages(sessionId);
      const loaded: Message[] = (msgs || []).map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        citations: m.citations,
        suggestedQuestions: m.suggested_questions,
        attachedDocs: m.attached_docs,
        timestamp: new Date(m.created_at),
      }));
      setMessages(loaded.length > 0 ? loaded : [{
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是基于机构知识库的AI助手。您可以向我提问任何与学习相关的问题，我会为您解答。\n\n💡 **提示**：点击输入框左侧的 **+** 按钮，可引用知识库文档或上传临时文件作为参考。',
        timestamp: new Date(),
      }]);
    } catch {
      toast.error('加载会话失败');
    }
  };

  // 新建会话
  const newSession = async () => {
    if (isLoading) return;
    try {
      const session = await chatApi.createSession();
      setChatSessionId(session.session_id);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是基于机构知识库的AI助手。您可以向我提问任何与学习相关的问题，我会为您解答。\n\n💡 **提示**：点击输入框左侧的 **+** 按钮，可引用知识库文档或上传临时文件作为参考。',
        timestamp: new Date(),
      }]);
      loadSessions();
    } catch {
      toast.error('创建会话失败');
    }
  };

  // 重命名会话
  const handleRenameSession = async (sessionId: string) => {
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await chatApi.renameSession(sessionId, editingTitle.trim());
      setEditingSessionId(null);
      loadSessions();
    } catch {
      toast.error('重命名失败');
    }
  };

  // 删除会话
  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(sessionId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await chatApi.deleteSession(confirmDeleteId);
      if (chatSessionId === confirmDeleteId) {
        setChatSessionId(null);
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是基于机构知识库的AI助手。您可以向我提问任何与学习相关的问题，我会为您解答。\n\n💡 **提示**：点击输入框左侧的 **+** 按钮，可引用知识库文档或上传临时文件作为参考。',
          timestamp: new Date(),
        }]);
      }
      loadSessions();
      toast.success('会话已删除');
    } catch {
      toast.error('删除失败');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Handle @ detection in input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);

    // Check if user just typed @
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^@\s]*)$/);
    if (atMatch) {
      setShowDocPicker(true);
      setDocSearchQuery(atMatch[1]);
      setAtCursorPos(cursorPos - atMatch[0].length);
    } else {
      setShowDocPicker(false);
      setDocSearchQuery('');
    }
  };

  const filteredDocs = allDocs.filter(
    (doc) =>
      doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) &&
      !selectedDocs.find((d) => d.id === doc.id)
  );

  const selectDoc = (doc: KBDocument) => {
    setSelectedDocs((prev) => [...prev, doc]);
    // Remove @query from input
    const before = input.slice(0, atCursorPos);
    const after = input.slice(input.indexOf(' ', atCursorPos) === -1 ? input.length : input.indexOf(' ', atCursorPos));
    setInput(before + after);
    setShowDocPicker(false);
    setDocSearchQuery('');
    inputRef.current?.focus();
  };

  const removeDoc = (docId: number) => {
    setSelectedDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  // Temp file handling
  const handleTempFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setTempFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeTempFile = (index: number) => {
    setTempFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (directMessage?: string) => {
    const msg = directMessage || input.trim();
    if (!msg || isLoading) return;

    const question = msg;
    const attachedDocNames = selectedDocs.map((d) => d.name);
    const attachedDocIds = selectedDocs.map((d) => d.id);

    // 如果有临时上传的文件，解析提取文本（不存储到知识库）
    let fileContext = '';
    if (tempFiles.length > 0) {
      toast('正在解析上传文件...', { icon: '📄' });
      for (const file of tempFiles) {
        try {
          const result = await chatApi.parseFile(file);
          if (result?.text) {
            fileContext += `\n【${result.filename}】\n${result.text}\n`;
            attachedDocNames.push(file.name);
          }
        } catch (err) {
          console.error('文件解析失败:', file.name, err);
          toast.error(`文件解析失败: ${file.name}`);
        }
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
      attachedDocs: attachedDocNames.length > 0 ? attachedDocNames : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!directMessage) setInput('');
    setSelectedDocs([]);
    setTempFiles([]);
    setIsLoading(true);

    try {
      // Ensure we have a session
      let sid = chatSessionId;
      if (!sid) {
        const session = await chatApi.createSession();
        sid = session.session_id;
        setChatSessionId(sid);
      }

      // Stream the response via SSE
      let fullContent = '';
      let thinkingContent = '';
      let citations: Citation[] = [];
      let suggestedQuestions: string[] = [];
      const assistantId = (Date.now() + 1).toString();

      // Add placeholder assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          thinking: '',
          timestamp: new Date(),
        },
      ]);

      // Create abort controller for this request
      const abortController = new AbortController();
      abortRef.current = abortController;

      for await (const chunk of chatApi.sendMessage(sid, question, attachedDocIds, abortController.signal, fileContext || undefined, attachedDocNames.length > 0 ? attachedDocNames : undefined)) {
        if (chunk.type === 'content') {
          fullContent += chunk.content || '';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            )
          );
        } else if (chunk.type === 'thinking') {
          thinkingContent += chunk.content || '';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, thinking: thinkingContent } : m
            )
          );
        } else if (chunk.type === 'citations') {
          citations = chunk.citations || [];
        } else if (chunk.type === 'suggested_questions') {
          suggestedQuestions = chunk.questions || [];
        } else if (chunk.type === 'error') {
          fullContent = chunk.content || '服务暂时不可用，请稍后重试。';
        } else if (chunk.type === 'done') {
          // 完成
        }
      }

      // Update final message with citations and suggestions
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
              ...m,
              content: fullContent || '抱歉，我暂时无法回答这个问题。',
              thinking: thinkingContent,
              citations,
              suggestedQuestions,
            }
            : m
        )
      );
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // 用户手动停止，不报错
      } else {
        // 安全提取错误信息：强制转 string，防止 sonner 内部 JSON.stringify 触碰循环引用
        let errMsg = '发送消息失败';
        try {
          if (typeof error?.message === 'string' && error.message) {
            errMsg = error.message;
          } else if (typeof error === 'string') {
            errMsg = error;
          }
        } catch {
          // ignore
        }
        toast.error(String(errMsg));
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: '抱歉，发送消息时出现了错误，请稍后重试。',
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      loadSessions();
    }
  };


  const handleContinue = () => {
    if (isLoading || !chatSessionId) return;
    handleSend('请继续');
  };

  const handleRegenerate = async () => {
    if (isLoading) return;
    // 找到最后一条用户消息
    const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMsgIndex === -1) return;
    const realIndex = messages.length - 1 - lastUserMsgIndex;
    const lastUserMsg = messages[realIndex];
    // 删除最后一轮对话（用户消息 + AI回复）
    setMessages(prev => prev.slice(0, realIndex));
    // 重新发送同一个问题
    setTimeout(() => handleSend(lastUserMsg.content), 100);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  // 清理 think 标签中的内容用于显示
  const cleanThinkTags = (text: string) => {
    return text.replace(/<\/?think>/g, '').trim();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* 历史会话侧边栏 */}
      {!sidebarCollapsed && (
        <div className="absolute inset-y-0 left-0 z-10 w-64 md:relative border-r border-border bg-card flex flex-col h-full shadow-lg md:shadow-none">
          <div className="flex-none px-3 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">历史会话</span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="收起侧边栏"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {loadingSessions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">暂无历史会话</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => editingSessionId !== s.id && switchSession(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group cursor-pointer ${chatSessionId === s.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                >
                  {editingSessionId === s.id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleRenameSession(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSession(s.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      className="w-full bg-transparent border-b border-primary/50 outline-none text-sm py-0.5"
                    />
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="truncate flex-1"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(s.id);
                            setEditingTitle(s.title || '新会话');
                          }}
                        >
                          {s.title || '新会话'}
                        </span>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteClick(s.id, e); }}
                          className="flex-none p-1 rounded opacity-40 hover:opacity-100 hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-all"
                          title="删除会话"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 block mt-0.5">
                        {new Date(s.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex-none px-3 py-3 border-t border-border">
            <button
              onClick={newSession}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <MessageSquarePlus className="size-4" />
              新建对话
            </button>
          </div>
        </div>
      )}

      {/* 主聊天区 */}
      <div className="flex-1 flex flex-col h-full min-h-0 w-full overflow-hidden">
        {/* Header */}
        <div className="flex-none px-4 md:px-6 py-3 border-b border-border bg-card flex items-center gap-3">
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="展开侧边栏"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          )}
          <div>
            <h1 className="text-base md:text-lg font-medium text-foreground">智能导师</h1>
            <p className="text-xs md:text-sm text-muted-foreground">基于知识库的AI助手 · 输入 @ 引用文档</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 relative z-0 pb-6">
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] ${message.role === 'user'
                    ? 'bg-muted text-foreground rounded-lg px-4 py-3'
                    : 'bg-card text-foreground rounded-lg border border-border px-4 py-3'
                    }`}
                >
                  {/* Attached docs badge */}
                  {message.attachedDocs && message.attachedDocs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {message.attachedDocs.map((docName, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                          <FileText className="size-3" />
                          {docName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Thinking (collapsible) */}
                  {message.thinking && message.thinking.trim() && (
                    <details className="mb-3">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 select-none py-1 px-2 rounded bg-muted/50">
                        <ChevronDown className="size-3" />
                        <span>💭 思考过程</span>
                      </summary>
                      <div className="mt-2 p-3 rounded bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {cleanThinkTags(message.thinking)}
                      </div>
                    </details>
                  )}

                  {/* Main content */}
                  <div className="markdown-body text-sm break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-3">
                            <table className="min-w-full text-xs border-collapse border border-border rounded">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-muted/60">{children}</thead>
                        ),
                        th: ({ children }) => (
                          <th className="px-3 py-2 text-left font-semibold border border-border">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td className="px-3 py-2 border border-border">{children}</td>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Citations */}
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="size-3" />
                        <span>引用来源</span>
                      </div>
                      {message.citations.map((citation: any) => (
                        <div
                          key={citation.id}
                          className="text-xs bg-muted rounded p-2 text-foreground"
                        >
                          <span className="font-medium text-success">[{citation.id}]</span>{' '}
                          <span className="font-medium">{citation.document_name || citation.source || '未知文档'}</span>
                          {(citation.content || citation.text) && (
                            <span className="text-muted-foreground"> — {citation.content || citation.text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Questions */}
                  {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <div className="text-xs text-muted-foreground mb-2">您可能还想问：</div>
                      {message.suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedQuestion(question)}
                          className="block w-full text-left text-xs bg-muted hover:bg-muted/70 rounded p-2 text-foreground transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-card rounded-lg border border-border px-4 py-3">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {/* 继续 / 重新生成 按钮 */}
            {!isLoading && messages.length > 1 && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex justify-center gap-3 py-2">
                <button
                  onClick={handleContinue}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <PlayCircle className="size-3.5" />
                  继续
                </button>
                <button
                  onClick={handleRegenerate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <RefreshCw className="size-3.5" />
                  重新生成
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - fixed at bottom, with extra padding for mobile bottom bar */}
        <div className="flex-none border-t border-border bg-card px-4 md:px-6 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 z-10 w-full box-border">
          <div className="max-w-3xl mx-auto">
            {/* Attached docs & files preview */}
            {(selectedDocs.length > 0 || tempFiles.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-2.5">
                {selectedDocs.map((doc) => (
                  <span
                    key={doc.id}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full"
                  >
                    <FileText className="size-3" />
                    {doc.name}
                    <button onClick={() => removeDoc(doc.id)} className="hover:bg-primary/20 rounded-full p-0.5">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {tempFiles.map((file, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full"
                  >
                    <Plus className="size-3" />
                    {file.name}
                    <button onClick={() => removeTempFile(i)} className="hover:bg-amber-100 rounded-full p-0.5">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Document picker popup */}
            {showDocPicker && (
              <div className="mb-2 bg-card rounded-lg border border-border shadow-lg max-h-48 overflow-y-auto">
                {filteredDocs.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    {docSearchQuery ? '未找到匹配的文档' : '暂无可引用的文档'}
                  </div>
                ) : (
                  filteredDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => selectDoc(doc)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-2 text-sm border-b border-border last:border-0"
                    >
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="text-foreground">{doc.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{doc.file_type}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2 items-end">
              {/* + 按钮（合并引用文档 + 上传临时文件） */}
              <div className="relative" ref={plusMenuRef}>
                <button
                  onClick={() => {
                    setShowPlusMenu(!showPlusMenu);
                    if (showDocPicker) setShowDocPicker(false);
                  }}
                  className={`flex-none p-2.5 rounded-lg border transition-all ${showPlusMenu || showDocPicker
                    ? 'border-primary bg-primary/10 text-primary rotate-45'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  title="添加参考内容"
                >
                  <Plus className="size-4 transition-transform" />
                </button>

                {/* + 菜单弹窗 */}
                {showPlusMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-card rounded-lg border border-border shadow-lg overflow-hidden z-20">
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        setShowDocPicker(true);
                        setDocSearchQuery('');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3 text-sm border-b border-border"
                    >
                      <BookOpen className="size-4 text-primary" />
                      <div>
                        <div className="text-foreground font-medium">引用知识库文档</div>
                        <div className="text-xs text-muted-foreground">从已上传的文档中选择</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3 text-sm"
                    >
                      <Paperclip className="size-4 text-amber-500" />
                      <div>
                        <div className="text-foreground font-medium">上传临时文件</div>
                        <div className="text-xs text-muted-foreground">添加本地文件作为参考</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                multiple
                onChange={handleTempFileSelect}
                className="hidden"
              />

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="输入您的问题... 输入 @ 引用文档"
                rows={1}
                className="flex-1 px-4 py-2.5 border border-border bg-input-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent text-sm text-foreground resize-none min-h-[42px] max-h-32"
                disabled={isLoading}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />

              {/* Send / Stop button */}
              {isLoading ? (
                <button
                  onClick={() => {
                    abortRef.current?.abort();
                    abortRef.current = null;
                    setIsLoading(false);
                  }}
                  className="flex-none px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  title="停止生成"
                >
                  <Square className="size-4 fill-current" />
                  <span className="hidden md:inline text-sm">停止</span>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex-none px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="size-4" />
                  <span className="hidden md:inline text-sm">发送</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="删除会话"
        message="确定要删除该会话吗？删除后所有聊天记录将无法恢复。"
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}