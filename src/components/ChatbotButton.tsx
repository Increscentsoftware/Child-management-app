import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Trash2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS = [
  {
    label: '✉️ Draft an email',
    text: 'Draft an email to a sponsor about a child\'s progress.',
    send: true,
  },
  {
    label: '📝 Improve my notes',
    text: 'Improve these notes: ',
    send: false,
  },
  {
    label: '❓ Ask a question',
    text: '',
    send: false,
  },
]

export default function ChatbotButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open && messages.length === 0) {
      textareaRef.current?.focus()
    }
  }, [open, messages.length])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json() as { content?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages(prev => [...prev, { role: 'assistant', content: data.content ?? '' }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again or contact smec@shishumandir.org.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (action: typeof QUICK_ACTIONS[number]) => {
    if (action.send && action.text) {
      send(action.text)
    } else {
      setInput(action.text)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  return (
    <>
      <style>{`
        .chatbot-fab { position: fixed; right: 20px; bottom: 90px; z-index: 1001; }
        .chatbot-panel { position: fixed; right: 20px; bottom: 152px; z-index: 1000; }
        @media (min-width: 768px) {
          .chatbot-fab { bottom: 28px; }
          .chatbot-panel { bottom: 92px; }
        }
        @keyframes chatbot-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes chatbot-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes chatbot-fadein {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>

      {/* Chat panel */}
      {open && (
        <div className="chatbot-panel" style={{
          width: 'min(360px, calc(100vw - 40px))',
          height: 520,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.07)',
          animation: 'chatbot-fadein 0.2s ease',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1a6b4a 0%, #1e7d56 100%)',
            padding: '13px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 34, height: 34, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageCircle size={17} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                Shishu Mandir Assistant
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
                Powered by ChatGPT
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                title="Clear chat"
                style={{
                  background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
                  borderRadius: 6, padding: '5px 7px', color: 'rgba(255,255,255,0.75)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
                borderRadius: 6, padding: '5px 7px', color: '#fff', display: 'flex',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 13px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>

            {/* Welcome / quick actions */}
            {messages.length === 0 && (
              <div>
                <div style={{
                  background: '#f5faf7', borderRadius: 12, padding: '11px 13px',
                  fontSize: 12, color: '#444', lineHeight: 1.55, marginBottom: 12,
                  border: '1px solid #d9edd9',
                }}>
                  Hi! I can help you draft emails, improve notes, or answer questions about Shishu Mandir.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {QUICK_ACTIONS.map(a => (
                    <button
                      key={a.label}
                      onClick={() => handleQuickAction(a)}
                      style={{
                        background: '#fafafa', border: '1.5px solid #e0ede5',
                        borderRadius: 10, padding: '9px 12px',
                        fontSize: 13, cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'inherit', color: '#1a6b4a', fontWeight: 500,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#eef7f1'
                        e.currentTarget.style.borderColor = '#a5d6b7'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#fafafa'
                        e.currentTarget.style.borderColor = '#e0ede5'
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '84%',
                  padding: '9px 12px',
                  borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  background: m.role === 'user' ? '#1a6b4a' : '#f2f2f2',
                  color: m.role === 'user' ? '#fff' : '#1a1a1a',
                  fontSize: 13, lineHeight: 1.55,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '14px 14px 14px 3px',
                  background: '#f2f2f2',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 0.18, 0.36].map((delay, idx) => (
                    <div key={idx} style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#999',
                      animation: `chatbot-bounce 0.9s infinite ${delay}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 11px 11px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex', gap: 8, alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              style={{
                flex: 1, border: '1.5px solid #e0e0e0', borderRadius: 10,
                padding: '8px 11px', fontSize: 13, fontFamily: 'inherit',
                resize: 'none', outline: 'none', lineHeight: 1.45,
                maxHeight: 100, overflowY: 'auto',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#1a6b4a'}
              onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0,
                background: input.trim() && !loading ? '#1a6b4a' : '#e5e5e5',
                color: input.trim() && !loading ? '#fff' : '#aaa',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {loading
                ? <Loader2 size={15} style={{ animation: 'chatbot-spin 0.8s linear infinite' }} />
                : <Send size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* Floating action button */}
      <button
        className="chatbot-fab"
        onClick={() => setOpen(o => !o)}
        title="Shishu Mandir Assistant"
        style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: open
            ? 'rgba(26,107,74,0.9)'
            : 'linear-gradient(135deg, #1a6b4a, #1e7d56)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 22px rgba(26,107,74,0.38)',
          color: '#fff',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.09)'
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(26,107,74,0.48)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 22px rgba(26,107,74,0.38)'
        }}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  )
}
