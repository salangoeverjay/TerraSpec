import React, { useState, useEffect, useMemo } from 'react';
import { CHAT_STORAGE_KEY, createConversation, loadConversations } from './data.js';
import { Icon, Btn } from './components.jsx';

export function ChatScreen({ initialConvId } = {}) {
  const initConvs = useMemo(() => loadConversations(), []);
  const [conversations, setConversations] = useState(initConvs);
  const [activeId, setActiveId] = useState(() => {
    let target = null;
    try { target = sessionStorage.getItem('ts-nav-conv'); if (target) sessionStorage.removeItem('ts-nav-conv'); } catch {}
    target = target || initialConvId || null;
    if (target && initConvs.some(c => c.id === target)) return target;
    return initConvs[0].id;
  });
  const [pinnedIds, setPinnedIds] = useState(() => new Set(initConvs.filter(c => c.pinned).map(c => c.id)));
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [sidebarRenameId, setSidebarRenameId] = useState(null);
  const [sidebarRenameDraft, setSidebarRenameDraft] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nlpPane, setNlpPane] = useState(true);
  const messagesRef = React.useRef(null);
  const headerMenuRef = React.useRef(null);

  const activeConv = conversations.find(c => c.id === activeId) || conversations[0];

  const pinnedConvs = useMemo(() => conversations.filter(c => pinnedIds.has(c.id)), [conversations, pinnedIds]);
  const unpinnedConvs = useMemo(() => conversations.filter(c => !pinnedIds.has(c.id)), [conversations, pinnedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(
        conversations.map(c => ({ ...c, pinned: pinnedIds.has(c.id) }))
      ));
    } catch { /* ignore */ }
  }, [conversations, pinnedIds]);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [activeConv?.messages]);

  useEffect(() => {
    setIsRenaming(false);
    setRenameDraft(activeConv?.title || '');
    setShowHeaderMenu(false);
    setMenuOpenId(null);
    setSidebarRenameId(null);
  }, [activeId]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!headerMenuRef.current?.contains(event.target)) {
        setShowHeaderMenu(false);
      }
      setMenuOpenId(null);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function updateActive(updater) {
    setConversations(cs => cs.map(c => c.id !== activeId ? c : { ...c, ...updater(c) }));
  }

  function newConv() {
    const c = createConversation(`Conversation ${conversations.length + 1}`);
    setConversations(cs => [c, ...cs]);
    setActiveId(c.id);
    setChatInput(''); setChatError('');
  }

  function deleteConv(id) {
    setPinnedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setConversations(cs => {
      const rest = cs.filter(c => c.id !== id);
      if (rest.length === 0) {
        const c = createConversation(); setActiveId(c.id); return [c];
      }
      if (id === activeId) setActiveId(rest[0].id);
      return rest;
    });
    setChatInput(''); setChatError('');
  }

  function togglePin(id) {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setMenuOpenId(null);
  }

  function submitSidebarRename() {
    const title = sidebarRenameDraft.trim();
    if (title && sidebarRenameId) {
      setConversations(cs => cs.map(c => c.id === sidebarRenameId ? { ...c, title } : c));
    }
    setSidebarRenameId(null);
  }

  function beginRename() {
    setRenameDraft(activeConv?.title || '');
    setIsRenaming(true);
    setShowHeaderMenu(false);
  }

  function submitRename() {
    const title = renameDraft.trim();
    if (!title || !activeConv) { setIsRenaming(false); return; }
    setConversations(cs => cs.map(c => (c.id === activeConv.id ? { ...c, title } : c)));
    setIsRenaming(false);
  }

  function removeActiveConversation() {
    if (!activeConv) return;
    const ok = window.confirm('Delete this chat history?');
    if (!ok) return;
    deleteConv(activeConv.id);
    setShowHeaderMenu(false);
  }

  async function sendChatPrompt(prompt) {
    const message = prompt.trim();
    if (!message || isLoading) return;
    setChatError(''); setIsLoading(true);

    updateActive(c => ({
      title: c.title === 'New conversation' || c.title.startsWith('Conversation ') ? message.slice(0, 40) : c.title,
      messages: [...c.messages, { role: 'user', content: message }, { role: 'assistant', content: 'Thinking...' }],
    }));

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message, context: { selection: 'Panabo City' } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validMsg = Object.values(payload?.errors || {}).flat().filter(Boolean)[0];
        throw new Error(payload?.message || validMsg || 'The assistant could not answer right now.');
      }
      updateActive(c => ({
        messages: c.messages.filter(m => m.content !== 'Thinking...').concat({ role: 'assistant', content: payload.answer || 'Gemini returned an empty response.' }),
      }));
    } catch (err) {
      const text = err instanceof Error ? err.message : 'The assistant could not answer right now.';
      setChatError(text);
      updateActive(c => ({
        messages: c.messages.filter(m => m.content !== 'Thinking...').concat({ role: 'assistant', content: 'Could not reach Gemini 2.5 Flash. Check the API key and try again.' }),
      }));
    } finally {
      setIsLoading(false); setChatInput('');
    }
  }

  const quickPrompts = ['Analyze flood risk for PCL-00473', 'Compare commercial zones', 'Best species for mangrove reforestation', 'Setback requirements overview'];
  const lastMsg = activeConv?.messages.slice(-1)[0];
  const detectedIntent = lastMsg?.role === 'user' ? 'land_suitability' : null;

  function renderConvItem(c) {
    const isPinned = pinnedIds.has(c.id);
    const isActive = c.id === activeId;
    const isHovered = hoveredId === c.id;
    const menuOpen = menuOpenId === c.id;
    const isRenamingInline = sidebarRenameId === c.id;

    return (
      <div
        key={c.id}
        style={{ position: 'relative', padding: '7px 8px', borderRadius: 7, cursor: 'pointer', background: isActive ? 'hsl(var(--accent))' : 'transparent', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}
        onMouseEnter={() => setHoveredId(c.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => { if (!isRenamingInline) setActiveId(c.id); }}
      >
        {isPinned && (
          <Icon name="pin" size={9} style={{ color: 'hsl(var(--brand))', flexShrink: 0, opacity: 0.7 }}/>
        )}

        {isRenamingInline ? (
          <input
            autoFocus
            value={sidebarRenameDraft}
            onChange={e => setSidebarRenameDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); submitSidebarRename(); }
              if (e.key === 'Escape') { e.preventDefault(); setSidebarRenameId(null); }
            }}
            onBlur={submitSidebarRename}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            className="input"
            style={{ flex: 1, height: 26, fontSize: 12, padding: '0 6px' }}
          />
        ) : (
          <span style={{ fontSize: 12.5, fontWeight: isActive ? 500 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.title}
          </span>
        )}

        {!isRenamingInline && (isHovered || menuOpen) && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpen ? null : c.id); }}
            style={{ background: menuOpen ? 'hsl(var(--accent))' : 'none', border: 'none', padding: 3, cursor: 'pointer', color: 'hsl(var(--muted-foreground))', flexShrink: 0, borderRadius: 4, display: 'flex', alignItems: 'center' }}
            title="Conversation options"
          >
            <Icon name="more" size={13}/>
          </button>
        )}

        {menuOpen && (
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{ position: 'absolute', top: 'calc(100% + 2px)', right: 0, minWidth: 160, border: '1px solid hsl(var(--border))', borderRadius: 8, background: 'hsl(var(--card))', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: 4, zIndex: 50 }}
          >
            <button
              onClick={e => { e.stopPropagation(); setSidebarRenameId(c.id); setSidebarRenameDraft(c.title); setMenuOpenId(null); }}
              className="row"
              style={{ width: '100%', border: 'none', background: 'transparent', padding: '7px 10px', borderRadius: 6, fontSize: 12.5, textAlign: 'left', color: 'hsl(var(--foreground))', cursor: 'pointer', gap: 8 }}
            >
              <Icon name="edit" size={12}/>
              <span>Rename</span>
            </button>
            <button
              onClick={e => { e.stopPropagation(); togglePin(c.id); }}
              className="row"
              style={{ width: '100%', border: 'none', background: 'transparent', padding: '7px 10px', borderRadius: 6, fontSize: 12.5, textAlign: 'left', color: 'hsl(var(--foreground))', cursor: 'pointer', gap: 8 }}
            >
              <Icon name="pin" size={12}/>
              <span>{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <div style={{ height: 1, background: 'hsl(var(--border))', margin: '3px 4px' }}/>
            <button
              onClick={e => {
                e.stopPropagation();
                setMenuOpenId(null);
                if (window.confirm('Delete this chat history?')) deleteConv(c.id);
              }}
              className="row"
              style={{ width: '100%', border: 'none', background: 'transparent', padding: '7px 10px', borderRadius: 6, fontSize: 12.5, textAlign: 'left', color: 'hsl(var(--destructive))', cursor: 'pointer', gap: 8 }}
            >
              <Icon name="trash" size={12}/>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Conversations list */}
      <div style={{ width: 220, borderRight: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', background: 'hsl(var(--background))' }}>
        <div style={{ padding: '12px 10px', borderBottom: '1px solid hsl(var(--border))' }}>
          <Btn variant="brand" icon="plus" onClick={newConv} style={{ width: '100%', justifyContent: 'center' }}>New Chat</Btn>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {pinnedConvs.length > 0 && (
            <>
              <div style={{ padding: '2px 8px 6px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--muted-foreground))' }}>Pinned</div>
              {pinnedConvs.map(renderConvItem)}
              {unpinnedConvs.length > 0 && (
                <div style={{ height: 1, background: 'hsl(var(--border))', margin: '6px 4px 8px' }}/>
              )}
            </>
          )}
          {unpinnedConvs.length > 0 && pinnedConvs.length > 0 && (
            <div style={{ padding: '2px 8px 6px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--muted-foreground))' }}>Recent</div>
          )}
          {unpinnedConvs.map(renderConvItem)}
        </div>
        <div style={{ padding: '10px 10px', borderTop: '1px solid hsl(var(--border))' }}>
          <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>Gemini 2.5 Flash</div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bot" size={16} style={{ color: 'white' }}/>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {isRenaming ? (
                <input
                  value={renameDraft}
                  onChange={e => setRenameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); submitRename(); }
                    if (e.key === 'Escape') { e.preventDefault(); setIsRenaming(false); }
                  }}
                  autoFocus
                  className="input"
                  style={{ height: 30, width: 240, fontSize: 13 }}
                  placeholder="Conversation name"
                />
              ) : (
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{activeConv?.title || 'Chat'}</div>
              )}
              {!isRenaming && (
                <div ref={headerMenuRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 28, height: 28 }}
                    onClick={() => setShowHeaderMenu(v => !v)}
                    title="Conversation actions"
                  >
                    <Icon name="more" size={14}/>
                  </button>
                  {showHeaderMenu && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 140, border: '1px solid hsl(var(--border))', borderRadius: 8, background: 'hsl(var(--card))', boxShadow: '0 10px 24px rgba(0,0,0,0.12)', padding: 4, zIndex: 20 }}>
                      <button type="button" onClick={beginRename} className="row" style={{ width: '100%', border: 'none', background: 'transparent', padding: '7px 9px', borderRadius: 6, fontSize: 12.5, textAlign: 'left', color: 'hsl(var(--foreground))', gap: 8 }}>
                        <Icon name="edit" size={12}/><span>Rename</span>
                      </button>
                      <button type="button" onClick={removeActiveConversation} className="row" style={{ width: '100%', border: 'none', background: 'transparent', padding: '7px 9px', borderRadius: 6, fontSize: 12.5, textAlign: 'left', color: 'hsl(var(--destructive))', gap: 8 }}>
                        <Icon name="trash" size={12}/><span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="muted" style={{ fontSize: 11.5 }}>{activeConv?.messages.length} messages</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {isRenaming && (
              <>
                <Btn sz="sm" variant="brand" icon="check" onClick={submitRename}>Save</Btn>
                <Btn sz="sm" variant="outline" icon="x" onClick={() => setIsRenaming(false)}>Cancel</Btn>
              </>
            )}
            <Btn sz="sm" variant="ghost" icon={nlpPane ? 'x' : 'sliders'} onClick={() => setNlpPane(v => !v)}>
              {nlpPane ? 'Hide' : 'NLP'} Inspector
            </Btn>
          </div>
        </div>

        <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {activeConv?.messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 14, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}>
              {m.role === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Icon name="bot" size={14} style={{ color: 'white' }}/>
                </div>
              )}
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: m.role === 'user' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: m.role === 'user' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                fontSize: 13.5, lineHeight: 1.55,
              }}>
                {m.content === 'Thinking...' ? (
                  <div className="row" style={{ gap: 4 }}>
                    {[0, 150, 300].map(d => (
                      <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(var(--muted-foreground))', display: 'inline-block', animation: `bounce 1.2s ${d}ms ease-in-out infinite` }}/>
                    ))}
                  </div>
                ) : m.content}
              </div>
            </div>
          ))}
        </div>

        {chatError && (
          <div style={{ margin: '0 18px 8px', padding: '8px 12px', borderRadius: 8, background: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive) / 0.25)', fontSize: 12.5, color: 'hsl(var(--destructive))' }}>{chatError}</div>
        )}

        <div style={{ padding: '8px 18px', borderTop: '1px solid hsl(var(--border) / 0.6)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quickPrompts.map(q => (
            <button key={q} onClick={() => sendChatPrompt(q)} disabled={isLoading} className="chip" style={{ fontSize: 11.5 }}>{q}</button>
          ))}
        </div>

        <div style={{ padding: '10px 18px 16px', borderTop: '1px solid hsl(var(--border))' }}>
          <div className="row" style={{ gap: 8 }}>
            <textarea
              rows={2}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendChatPrompt(chatInput); } }}
              placeholder="Ask about land suitability, zoning, or reforestation…"
              className="input"
              style={{ flex: 1, height: 'auto', padding: '10px 12px', resize: 'none', lineHeight: 1.5 }}
            />
            <Btn variant="brand" icon="send" disabled={isLoading || !chatInput.trim()} onClick={() => void sendChatPrompt(chatInput)}/>
          </div>
        </div>
      </div>

      {/* NLP Inspector */}
      {nlpPane && (
        <div style={{ width: 260, borderLeft: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', background: 'hsl(var(--muted) / 0.3)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid hsl(var(--border))' }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))' }}>NLP Inspector</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Detected Intent</div>
              <span className={`badge${detectedIntent ? ' badge-brand' : ''}`}>{detectedIntent || 'none'}</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Entities</div>
              <div className="stack" style={{ gap: 5 }}>
                {['PCL-00184', 'Poblacion', 'R-1'].map(e => (
                  <div key={e} className="row" style={{ gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(var(--brand))', flexShrink: 0 }}/>
                    <span style={{ fontSize: 12 }}>{e}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Context Window</div>
              <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>
                {activeConv?.messages.length} messages · Panabo City · Suitability analysis enabled
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
