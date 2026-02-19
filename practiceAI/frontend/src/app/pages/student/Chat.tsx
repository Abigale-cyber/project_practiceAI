import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, ChevronDown, Plus, X, Paperclip, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatApi, knowledgeApi } from '../../api';

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
      content:
        '您好！我是基于机构知识库的AI助手。您可以向我提问任何与学习相关的问题，我会为您解答。\n\n💡 **提示**：输入 `@` 可引用指定文档，点击 📎 可上传临时文件作为参考。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Create a chat session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const session = await chatApi.createSession();
        setChatSessionId(session.session_id);
      } catch {
        // will create on first send
      }
    };
    init();
  }, []);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    const attachedDocNames = selectedDocs.map((d) => d.name);
    const attachedDocIds = selectedDocs.map((d) => d.id);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
      attachedDocs: attachedDocNames.length > 0 ? attachedDocNames : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
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

      for await (const chunk of chatApi.sendMessage(sid, question, attachedDocIds)) {
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
      toast.error(error.message || '发送消息失败');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: '抱歉，发送消息时出现了错误，请稍后重试。',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
    <div className="size-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-border bg-card">
        <h1 className="text-lg font-medium text-foreground">智能导师</h1>
        <p className="text-sm text-muted-foreground">基于知识库的AI助手 · 输入 @ 引用文档</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-3xl mx-auto space-y-6">
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

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - fixed at bottom */}
      <div className="flex-none border-t border-border bg-card px-4 md:px-6 py-3 md:py-4">
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

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-none px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="size-4" />
              <span className="hidden md:inline text-sm">发送</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}