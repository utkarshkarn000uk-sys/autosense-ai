import React, { useState, useRef, useEffect } from 'react'
import API from '../api'

const SUGGESTIONS = [
  "What's a good budget SUV under $20k?",
  "How often should I change my oil?",
  "Is Toyota more reliable than Honda?",
  "What should I check when buying a used car?",
]

export default function Chat() {
  const [messages, setMessages] = useState([{
    role: 'ai',
    text: "Hi! I'm your AutoSense AI mechanic. I can help with car buying advice, maintenance tips, price analysis, and market insights. What would you like to know?"
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const SESSION = useRef('session-' + Date.now())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    setMessages(prev => [...prev, { role: 'ai', text: '' }])

    try {
      const res = await API.post('/chat', {
        message: msg,
        session_id: SESSION.current
      })
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'ai',
          text: res.data.response
        }
        return updated
      })
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'ai',
          text: 'Sorry, I could not connect. Please try again!'
        }
        return updated
      })
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <h1 className="page-title">AI mechanic</h1>
      <p className="page-sub">Ask anything about cars, maintenance, buying advice, or market trends</p>

      <div style={styles.layout}>
        <div style={styles.chatCard}>
          <div style={styles.chatHeader}>
            <div style={styles.aiAvatar}>
              <span style={{fontSize:'16px'}}>🔧</span>
            </div>
            <div>
              <div style={styles.aiName}>AutoSense AI mechanic</div>
              <div style={styles.aiStatus}>Online · Powered by LangGraph + Groq</div>
            </div>
            <div style={{marginLeft:'auto'}}>
              <span className="badge badge-green">Live</span>
            </div>
          </div>

          <div style={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} style={styles.chip} onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>

          <div style={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                ...styles.msgWrap,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                {msg.role === 'ai' && (
                  <div style={styles.aiAvatarSmall}>🔧</div>
                )}
                <div style={{
                  ...styles.bubble,
                  background: msg.role === 'user' ? '#E24B4A' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1a1a1a',
                  borderRadius: msg.role === 'user'
                    ? '12px 2px 12px 12px'
                    : '2px 12px 12px 12px',
                }}>
                  {msg.text || (loading && i === messages.length - 1
                    ? '🤔 Thinking...'
                    : '')}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about your car..."
              disabled={loading}
            />
            <button
              style={{...styles.sendBtn, opacity: loading ? 0.7 : 1}}
              onClick={() => send()}
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>

        <div style={styles.sidebar}>
          <div className="card">
            <div className="card-title">What I can help with</div>
            {[
              { icon: '💰', title: 'Price analysis', desc: 'Get fair market value for any car' },
              { icon: '🔧', title: 'Maintenance tips', desc: 'Service schedules and repair advice' },
              { icon: '🚗', title: 'Buying guide', desc: 'What to check before buying' },
              { icon: '📊', title: 'Market trends', desc: 'Best time to buy or sell' },
            ].map((item, i) => (
              <div key={i} style={styles.helpItem}>
                <div style={styles.helpIcon}>{item.icon}</div>
                <div>
                  <div style={styles.helpTitle}>{item.title}</div>
                  <div style={styles.helpDesc}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{marginTop:'14px'}}>
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=180&fit=crop"
              alt="mechanic"
              style={{width:'100%',height:'120px',objectFit:'cover',borderRadius:'8px',marginBottom:'12px'}}
            />
            <div style={{fontSize:'13px',color:'#888',lineHeight:'1.6'}}>
              Our AI mechanic is trained on automotive data and powered by advanced language models for accurate, helpful advice.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  chatCard: {
    flex: 1,
    background: 'white',
    borderRadius: '14px',
    border: '0.5px solid #e5e5e5',
    overflow: 'hidden',
  },
  chatHeader: {
    padding: '14px 16px',
    borderBottom: '0.5px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  aiAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a1a1a',
  },
  aiStatus: {
    fontSize: '11px',
    color: '#22c55e',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '12px 16px',
    borderBottom: '0.5px solid #f0f0f0',
  },
  chip: {
    fontSize: '11px',
    padding: '5px 10px',
    borderRadius: '999px',
    border: '0.5px solid #e5e5e5',
    background: 'transparent',
    color: '#888',
    cursor: 'pointer',
  },
  messages: {
    padding: '16px',
    minHeight: '300px',
    maxHeight: '400px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  msgWrap: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  aiAvatarSmall: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
  },
  bubble: {
    padding: '10px 14px',
    fontSize: '13px',
    lineHeight: '1.6',
    maxWidth: '80%',
    border: '0.5px solid #f0f0f0',
    whiteSpace: 'pre-wrap',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '0.5px solid #f0f0f0',
  },
  input: {
    flex: 1,
    padding: '9px 12px',
    border: '0.5px solid #e5e5e5',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
  },
  sendBtn: {
    padding: '9px 18px',
    background: '#E24B4A',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  sidebar: { width: '260px', flexShrink: 0 },
  helpItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  helpIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  helpTitle: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '2px',
  },
  helpDesc: {
    fontSize: '11px',
    color: '#888',
  },
}