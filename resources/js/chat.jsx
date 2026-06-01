import React, { useState, useEffect, useMemo } from 'react';
import { createConversation, loadConversations, getChatStorageKey, getOrCreateGuestToken, GUEST_TOKEN_KEY } from './data.js';
import { Icon, Btn } from './components.jsx';

function renderInline(text) {
  const result = [];
  const pattern = /(\*\*[^*\n]+\*\*|\*(?!\*)[^*\n]+\*)/g;
  let last = 0, key = 0, match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) result.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      result.push(<strong key={key++} style={{ fontWeight: 700 }}>{token.slice(2, -2)}</strong>);
    } else {
      result.push(<strong key={key++} style={{ fontWeight: 600 }}>{token.slice(1, -1)}</strong>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) result.push(text.slice(last));
  return result;
}

function renderMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  const lines = text.split('\n');
  const blocks = [];
  let listItems = [];
  let listType  = null;
  let k = 0;

  function flushList() {
    if (!listItems.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(
      <Tag key={k++} style={{ margin: '5px 0 6px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {listItems.map((item, i) => (
          <li key={i} style={{ lineHeight: 1.55 }}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listItems = []; listType = null;
  }

  for (const line of lines) {
    const t = line.trimStart();
    if (/^[-*•] /.test(t)) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(t.slice(2).trimStart());
    } else if (/^\d+\. /.test(t)) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(t.replace(/^\d+\. /, '').trimStart());
    } else {
      flushList();
      if (t === '') {
        if (blocks.length) blocks.push(<div key={k++} style={{ height: 5 }}/>);
      } else {
        blocks.push(<div key={k++} style={{ lineHeight: 1.6 }}>{renderInline(t)}</div>);
      }
    }
  }
  flushList();
  return <>{blocks}</>;
}

const ANALYSIS_COLORS = {
  commercial:    '#3b82f6',
  residential:   '#f97316',
  industrial:    '#8b5cf6',
  agricultural:  '#84cc16',
  reforestation: '#16a34a',
};

function LiveCalcCard({ data, go }) {
  const scoreColor = data.total_pct >= 75 ? '#16a34a' : data.total_pct >= 50 ? '#d97706' : '#dc2626';
  const typeColor  = ANALYSIS_COLORS[data.analysis_type] ?? 'hsl(var(--brand))';

  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14, maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)', flexShrink: 0 }}/>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#16a34a' }}>Live AHP-WLC Result</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{data.zone_name}</div>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{data.zone_type}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: scoreColor, lineHeight: 1, letterSpacing: '-0.03em' }}>{data.total_pct}%</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: scoreColor, marginTop: 2 }}>{data.suitability_level}</div>
          <div style={{ marginTop: 4, display: 'inline-block', padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: typeColor + '20', color: typeColor, textTransform: 'capitalize' }}>
            {data.analysis_type}
          </div>
        </div>
      </div>

      {/* Criteria bars */}
      {data.criteria_breakdown && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
          {Object.entries(data.criteria_breakdown).map(([name, vals]) => {
            const pct = Math.round(vals.score * 100);
            const barColor = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 100, fontSize: 10, color: 'hsl(var(--muted-foreground))', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ flex: 1, background: 'hsl(var(--muted))', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.6s ease' }}/>
                </div>
                <div style={{ width: 30, fontSize: 10, fontWeight: 600, textAlign: 'right', color: barColor }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid hsl(var(--border))', paddingTop: 8 }}>
        {go && (
          <button
            onClick={() => go('suitability')}
            style={{ flex: 1, background: 'hsl(var(--muted))', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'hsl(var(--foreground))' }}
          >
            Full Rankings
          </button>
        )}
        {go && (
          <button
            onClick={() => go('map', { highlightZones: [{ zone_unit_id: data.zone_unit_id, unit_name: data.zone_name, total_pct: data.total_pct }] })}
            style={{ flex: 1, background: 'hsl(var(--brand))', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Icon name="map" size={11} style={{ color: 'white' }}/>
            View on Map
          </button>
        )}
      </div>
    </div>
  );
}

export function ChatScreen({ initialConvId, go, role = 'public', mapContext, setMapContext } = {}) {
  const [conversations, setConversations] = useState(() => loadConversations(role));
  const [activeId, setActiveId] = useState(() => {
    const convs = loadConversations(role);
    let target = null;
    try { target = sessionStorage.getItem('ts-nav-conv'); if (target) sessionStorage.removeItem('ts-nav-conv'); } catch {}
    target = target || initialConvId || null;
    if (target && convs.some(c => c.id === target)) return target;
    return convs[0]?.id ?? null;
  });
  const [pinnedIds, setPinnedIds] = useState(() => {
    const convs = loadConversations(role);
    return new Set(convs.filter(c => c.pinned).map(c => c.id));
  });
  const [guestToken, setGuestToken] = useState(() => role !== 'admin' ? getOrCreateGuestToken() : null);
  const [tokenCopied, setTokenCopied]   = useState(false);
  const [showRestore, setShowRestore]   = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreError, setRestoreError] = useState('');
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
  const [nlpData, setNlpData] = useState({ intent: null, entities: [], messageCount: 0 });
  const messagesRef = React.useRef(null);
  const headerMenuRef = React.useRef(null);

  const activeConv = conversations.find(c => c.id === activeId) || conversations[0];

  const pinnedConvs = useMemo(() => conversations.filter(c => pinnedIds.has(c.id)), [conversations, pinnedIds]);
  const unpinnedConvs = useMemo(() => conversations.filter(c => !pinnedIds.has(c.id)), [conversations, pinnedIds]);

  // Reload conversations when role switches (admin ↔ public)
  useEffect(() => {
    const loaded = loadConversations(role);
    setConversations(loaded);
    setPinnedIds(new Set(loaded.filter(c => c.pinned).map(c => c.id)));
    setActiveId(loaded[0]?.id ?? null);
    setChatInput('');
    setChatError('');
  }, [role]);

  useEffect(() => {
    try {
      window.localStorage.setItem(getChatStorageKey(role), JSON.stringify(
        conversations.map(c => ({ ...c, pinned: pinnedIds.has(c.id) }))
      ));
    } catch { /* ignore */ }
  }, [conversations, pinnedIds, role]);

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
        body: JSON.stringify({
          prompt: message,
          context: {
            selection:   mapContext?.barangay ?? 'Panabo City',
            suitability: mapContext?.score    ?? null,
            zone:        mapContext?.zone     ?? null,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validMsg = Object.values(payload?.errors || {}).flat().filter(Boolean)[0];
        throw new Error(payload?.message || validMsg || 'The assistant could not answer right now.');
      }
      updateActive(c => {
        const intent   = payload.detected_intent || null;
        const entities = payload.extracted_entities || [];
        const msgs = c.messages.filter(m => m.content !== 'Thinking...').concat({
          role:             'assistant',
          content:          payload.answer || 'Gemini returned an empty response.',
          zones:            payload.recommended_zones ?? [],
          live_calculation: payload.live_calculation || null,
          followups:        buildFollowups(intent, entities),
        });
        setNlpData({
          intent:       payload.detected_intent  || null,
          entities:     payload.extracted_entities || [],
          messageCount: msgs.length,
        });
        return { messages: msgs };
      });
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

  function buildFollowups(intent, entities) {
    const barangays = entities.filter(e => e.type === 'barangay').map(e => e.value);
    const hazards   = entities.filter(e => e.type === 'hazard').map(e => e.value);
    const species   = entities.filter(e => e.type === 'species').map(e => e.value);
    const b1 = barangays[0], b2 = barangays[1];

    const pick = (...opts) => opts.filter(Boolean).slice(0, 3);

    switch (intent) {
      case 'commercial_suitability':
        return pick(
          b1 ? `What are the flood risks in ${b1}?` : null,
          b1 && b2 ? `Compare ${b1} and ${b2} for commercial` : `Show top 5 commercial zones in Panabo City`,
          b1 ? `Generate a suitability report for ${b1}` : `What zoning is required for a commercial building?`,
        );
      case 'residential_suitability':
        return pick(
          b1 ? `Are there environmental restrictions in ${b1}?` : null,
          b1 ? `Calculate residential suitability for ${b1}` : `Best barangays for residential near the city center`,
          `What are the setback requirements for residential zones?`,
        );
      case 'industrial_suitability':
        return pick(
          b1 ? `Is ${b1} near any protected zones?` : null,
          b1 ? `What is the liquefaction risk in ${b1}?` : `Top industrial zones in Panabo City`,
          `What land uses are allowed in industrial zones?`,
        );
      case 'agricultural_suitability':
        return pick(
          b1 ? `What soil type does ${b1} have?` : null,
          `Which barangays fall under SAFDZ restrictions?`,
          `What crops are viable in flat-terrain agricultural zones?`,
        );
      case 'reforestation':
        return pick(
          b1 ? `What tree species are best for ${b1}?` : null,
          species[0] ? `Tell me more about ${species[0]}` : `Which barangays need reforestation most?`,
          `What are the watershed protection zones in Panabo City?`,
        );
      case 'environmental_assessment':
        return pick(
          b1 ? `What are the restrictions in ${b1}?` : null,
          hazards[0] ? `Which barangays have ${hazards[0]} risk?` : `Show all protected zones in Panabo City`,
          `What environmental clearance is needed for development?`,
        );
      case 'zoning_compliance':
        return pick(
          b1 ? `What is the zoning classification of ${b1}?` : null,
          `What land uses are allowed in commercial zones?`,
          `What are the setback requirements along classified roads?`,
        );
      default:
        return [
          'Where can I build a business in Panabo City?',
          'Which barangays are at high flood risk?',
          'Top reforestation sites in Panabo City',
        ];
    }
  }

  function copyToken() {
    if (!guestToken) return;
    navigator.clipboard?.writeText(guestToken).catch(() => {});
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  function handleRestore() {
    const token = restoreInput.trim().toUpperCase();
    if (!token) { setRestoreError('Enter a Chat ID.'); return; }
    const key = `terraspec-chat-guest-${token}`;
    try {
      const saved = window.localStorage.getItem(key);
      if (!saved) { setRestoreError('No history found for this ID.'); return; }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) { setRestoreError('No conversations found.'); return; }
      // Swap the active guest token so future saves go to this key
      window.localStorage.setItem(GUEST_TOKEN_KEY, token);
      setGuestToken(token);
      const loaded = parsed.map(c => ({
        id: c.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        title: c.title || 'Conversation',
        pinned: !!c.pinned,
        messages: Array.isArray(c.messages) && c.messages.length > 0 ? c.messages : createConversation().messages,
      }));
      setConversations(loaded);
      setPinnedIds(new Set(loaded.filter(c => c.pinned).map(c => c.id)));
      setActiveId(loaded[0]?.id ?? null);
      setShowRestore(false);
      setRestoreInput('');
      setRestoreError('');
    } catch { setRestoreError('Invalid Chat ID.'); }
  }

  const quickPrompts = useMemo(() => {
    const b      = mapContext?.barangay;
    const intent = nlpData.intent;
    const talked = (activeConv?.messages?.length ?? 0) > 1;

    // ── Admin prompts (no mapContext, fresh chat) ──────────────────────────
    if (!talked && role === 'admin') return [
      'Run a commercial suitability analysis for all barangays',
      'Which zones have the highest flood risk?',
      'Generate a city-wide comparative analysis',
      'Which barangays need reforestation most urgently?',
    ];

    // ── Public fresh chat ──────────────────────────────────────────────────
    if (!talked) return [
      'Where can I build a business in Panabo City?',
      'Best barangays for residential development',
      'Top reforestation sites in Panabo',
      'Which barangays are at high flood risk?',
    ];

    // ── Barangay selected + intent-aware ──────────────────────────────────
    if (b) {
      const report = role === 'admin' ? `Generate a suitability report for ${b}` : `Compare ${b} with nearby barangays`;
      switch (intent) {
        case 'commercial_suitability':   return [`What are the flood risks in ${b}?`, `Are there restrictions in ${b}?`, `Calculate residential suitability for ${b}`, report];
        case 'residential_suitability':  return [`What hazards affect ${b}?`, `What is the zoning classification of ${b}?`, `Is ${b} near any protected areas?`, report];
        case 'industrial_suitability':   return [`What is the liquefaction risk in ${b}?`, `Are there protected zones near ${b}?`, `What infrastructure is available in ${b}?`, report];
        case 'agricultural_suitability': return [`What is the soil type in ${b}?`, `Are there SAFDZ restrictions in ${b}?`, `What crops are viable in ${b}?`, report];
        case 'reforestation':            return [`What tree species are best for ${b}?`, `Are there watershed restrictions in ${b}?`, `What is the elevation range of ${b}?`, role === 'admin' ? `Generate a reforestation plan for ${b}` : `Other reforestation barangays near ${b}`];
        case 'environmental_assessment': return [`What is the suitability score of ${b}?`, `What development is allowed in ${b}?`, `Which barangays have similar flood risk?`, report];
        case 'zoning_compliance':        return [`What uses are allowed in ${b}?`, `What permits are needed to build in ${b}?`, `What zone is ${b} classified under?`, report];
        default: return [
          `What is the commercial suitability of ${b}?`,
          `What environmental restrictions apply to ${b}?`,
          `What tree species are best for ${b}?`,
          report,
        ];
      }
    }

    // ── Intent-aware, no barangay ─────────────────────────────────────────
    switch (intent) {
      case 'commercial_suitability':   return ['Which barangays have the highest commercial suitability?', 'What environmental risks should I check before building?', 'Best barangays for a hospital or clinic?', role === 'admin' ? 'Run commercial analysis for all 40 barangays' : 'Top 5 commercial zones in Panabo City'];
      case 'residential_suitability':  return ['Which barangays are best for subdivisions?', 'What setback requirements apply to residential zones?', 'Which residential zones are near schools?', role === 'admin' ? 'Run residential analysis for all barangays' : 'Best family neighborhoods in Panabo'];
      case 'industrial_suitability':   return ['Which barangays have the lowest flood risk for industrial use?', 'What permits are needed for industrial construction?', 'Are there industrial zones near the port?', role === 'admin' ? 'Run industrial analysis for all barangays' : 'Top industrial zones in Panabo'];
      case 'agricultural_suitability': return ['Which barangays fall under SAFDZ restrictions?', 'Best soil types for banana cultivation?', 'Which agricultural zones allow aquaculture?', role === 'admin' ? 'Run agricultural analysis for all barangays' : 'Top farming barangays in Panabo'];
      case 'reforestation':            return ['Which barangays are inside watershed zones?', 'What native trees grow best near the coast?', 'Show me mangrove reforestation priority areas', role === 'admin' ? 'Generate a reforestation plan' : 'Where are DENR priority reforestation sites?'];
      case 'environmental_assessment': return ['Which barangays have storm surge risk?', 'Show all SAFDZ restricted areas', 'Which areas are safest from flooding?', role === 'admin' ? 'Export an environmental assessment report' : 'Best areas to avoid flood risk?'];
      case 'zoning_compliance':        return ['What uses are allowed in agricultural zones?', 'Which barangays have mixed-use zoning?', 'What permits are needed for commercial construction?', role === 'admin' ? 'Review compliance for all urban barangays' : 'How do I verify zoning for my land?'];
      default:
        return role === 'admin'
          ? ['Run a commercial analysis for all 40 barangays', 'Which zones have critical flood exposure?', 'Generate a city-wide comparative report', 'Which barangays need reforestation most urgently?']
          : ['Where can I build a business in Panabo City?', 'Best barangays for residential development', 'Top reforestation sites in Panabo', 'Which barangays are at high flood risk?'];
    }
  }, [role, nlpData.intent, mapContext?.barangay, activeConv?.messages?.length]);
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
          {role === 'admin' ? (
            <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>LGU Admin · Gemini 2.5 Flash</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Current token display */}
              <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>Your Chat ID</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'hsl(var(--muted))', borderRadius: 6, padding: '4px 8px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, flex: 1, letterSpacing: '0.05em', color: 'hsl(var(--brand))', userSelect: 'all' }}>{guestToken}</span>
                <button onClick={copyToken} title="Copy Chat ID" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
                  <Icon name={tokenCopied ? 'check' : 'copy'} size={11}/>
                </button>
              </div>

              {/* Restore panel */}
              {showRestore ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="muted" style={{ fontSize: 10, textAlign: 'center' }}>Enter a saved Chat ID to restore</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      autoFocus
                      value={restoreInput}
                      onChange={e => { setRestoreInput(e.target.value.toUpperCase()); setRestoreError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleRestore(); if (e.key === 'Escape') { setShowRestore(false); setRestoreInput(''); setRestoreError(''); } }}
                      placeholder="XXXXX-XXXXX"
                      maxLength={11}
                      className="input"
                      style={{ flex: 1, height: 28, fontSize: 11, padding: '0 7px', fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                    />
                    <button
                      onClick={handleRestore}
                      title="Restore"
                      style={{ width: 28, height: 28, borderRadius: 6, background: 'hsl(var(--brand))', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <Icon name="check" size={12} style={{ color: 'white' }}/>
                    </button>
                  </div>
                  {restoreError && (
                    <div style={{ fontSize: 10, color: 'hsl(var(--destructive))', textAlign: 'center' }}>{restoreError}</div>
                  )}
                  <button onClick={() => { setShowRestore(false); setRestoreInput(''); setRestoreError(''); }} style={{ background: 'none', border: 'none', fontSize: 10, color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: 0, textAlign: 'center' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRestore(true)}
                  style={{ background: 'none', border: 'none', fontSize: 10, color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: '2px 0', textAlign: 'center', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                >
                  Restore a previous chat
                </button>
              )}
            </div>
          )}
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
              <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.content === 'Thinking...' ? (
                  /* ── Typing indicator ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '12px 18px',
                      borderRadius: '12px 12px 12px 4px',
                      background: 'hsl(var(--muted))',
                      border: '1px solid hsl(var(--border))',
                      width: 'fit-content',
                    }}>
                      {[0, 180, 360].map(d => (
                        <span key={d} style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: 'hsl(var(--brand))',
                          display: 'inline-block',
                          animation: `bounce 1.5s ${d}ms ease-in-out infinite`,
                        }}/>
                      ))}
                    </div>
                    <span style={{
                      fontSize: 10.5, color: 'hsl(var(--muted-foreground))',
                      paddingLeft: 4, animation: 'typing-pulse 2s ease-in-out infinite',
                    }}>
                      TerraSpec AI is typing…
                    </span>
                  </div>
                ) : (
                  /* ── Regular message bubble ── */
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: m.role === 'user' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                    color: m.role === 'user' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                    fontSize: 13.5, lineHeight: 1.55,
                  }}>
                    {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                  </div>
                )}
                {m.role === 'assistant' && m.zones?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {m.zones.map((z, zi) => (
                        <div
                          key={z.zone_unit_id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 8,
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--brand) / 0.35)',
                            fontSize: 12, cursor: 'default',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'hsl(var(--brand))', minWidth: 16 }}>{zi + 1}</span>
                          <span style={{ fontWeight: 500 }}>{z.unit_name}</span>
                          <span style={{
                            padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: z.total_pct >= 75 ? 'hsl(142 72% 29% / 0.15)' : z.total_pct >= 55 ? 'hsl(38 92% 50% / 0.15)' : 'hsl(var(--muted))',
                            color: z.total_pct >= 75 ? 'hsl(142 72% 29%)' : z.total_pct >= 55 ? 'hsl(32 95% 44%)' : 'hsl(var(--muted-foreground))',
                          }}>{z.total_pct}%</span>
                        </div>
                      ))}
                    </div>
                    {go && (
                      <button
                        onClick={() => go('map', { highlightZones: m.zones })}
                        style={{
                          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: 'hsl(var(--brand))', color: 'white',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        <Icon name="map" size={12} style={{ color: 'white' }}/>
                        View on Map
                      </button>
                    )}
                  </div>
                )}

                {/* Live Calculation Card */}
                {m.role === 'assistant' && m.live_calculation && (
                  <LiveCalcCard data={m.live_calculation} go={go}/>
                )}

                {/* Follow-up suggestions — only on last assistant message */}
                {m.role === 'assistant' && m.followups?.length > 0 && i === [...(activeConv?.messages ?? [])].map((x, idx) => x.role === 'assistant' ? idx : -1).filter(x => x >= 0).at(-1) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}>
                      Follow-up suggestions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {m.followups.map((q, qi) => (
                        <button
                          key={qi}
                          onClick={() => { if (!isLoading) sendChatPrompt(q); }}
                          disabled={isLoading}
                          style={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            padding: '7px 11px',
                            fontSize: 12,
                            cursor: isLoading ? 'default' : 'pointer',
                            color: 'hsl(var(--foreground))',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            opacity: isLoading ? 0.5 : 1,
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.borderColor = 'hsl(var(--brand))'; e.currentTarget.style.background = 'hsl(var(--brand) / 0.05)'; }}}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.background = 'hsl(var(--card))'; }}
                        >
                          <span style={{ color: 'hsl(var(--brand))', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>→</span>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
          {/* Context Chip */}
          {mapContext?.barangay && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '5px 10px', background: 'hsl(var(--brand) / 0.08)', border: '1px solid hsl(var(--brand) / 0.25)', borderRadius: 8, fontSize: 12 }}>
              <Icon name="pin" size={11} style={{ color: 'hsl(var(--brand))', flexShrink: 0 }}/>
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>Viewing:</span>
              <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>{mapContext.barangay}</span>
              {mapContext.zone && (
                <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 4, background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))', fontWeight: 600 }}>{mapContext.zone}</span>
              )}
              {mapContext.score && (
                <span style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))' }}>{mapContext.score}%</span>
              )}
              <span style={{ flex: 1 }}/>
              <button
                onClick={() => setMapContext?.(null)}
                title="Clear context"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: '0 2px', lineHeight: 1, fontSize: 14 }}
              >×</button>
            </div>
          )}
          <div className="row" style={{ gap: 8 }}>
            <textarea
              rows={2}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendChatPrompt(chatInput); } }}
              placeholder={mapContext?.barangay ? `Ask about ${mapContext.barangay}…` : 'Ask about land suitability, zoning, or reforestation…'}
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

            {/* Detected Intent */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Detected Intent</div>
              {nlpData.intent ? (
                <span className="badge badge-brand" style={{ fontSize: 11, textTransform: 'lowercase', letterSpacing: '0.02em' }}>
                  {nlpData.intent.replace(/_/g, ' ')}
                </span>
              ) : (
                <span className="badge" style={{ fontSize: 11 }}>none</span>
              )}
            </div>

            {/* Extracted Entities */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>
                Entities {nlpData.entities.length > 0 && <span style={{ fontWeight: 400, opacity: 0.6 }}>({nlpData.entities.length})</span>}
              </div>
              {nlpData.entities.length === 0 ? (
                <div className="muted" style={{ fontSize: 11.5 }}>Send a message to extract entities.</div>
              ) : (
                <div className="stack" style={{ gap: 5 }}>
                  {nlpData.entities.map((e, i) => {
                    const dotColor = {
                      barangay: 'hsl(var(--brand))',
                      zone:     '#3b82f6',
                      parcel:   '#8b5cf6',
                      species:  '#0d9488',
                      hazard:   'hsl(var(--destructive))',
                    }[e.type] ?? 'hsl(var(--muted-foreground))';
                    return (
                      <div key={i} className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }}/>
                        <span style={{ fontSize: 12, flex: 1 }}>{e.value}</span>
                        <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{e.type}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Context Window */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Context Window</div>
              <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6 }}>
                <div>{activeConv?.messages.length ?? 0} messages in history</div>
                <div>Locale · {mapContext?.barangay ? <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{mapContext.barangay}</span> : 'Panabo City'}</div>
                <div>Model · Gemini 2.5 Flash</div>
                {mapContext?.barangay && (
                  <div style={{ marginTop: 4, padding: '3px 7px', borderRadius: 5, background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', fontWeight: 500, fontSize: 11 }}>
                    Map context active
                  </div>
                )}
                {nlpData.intent && (
                  <div style={{ marginTop: 4, color: 'hsl(var(--brand))', fontWeight: 500 }}>
                    {nlpData.intent.replace(/_/g, ' ')} enabled
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
