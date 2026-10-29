import React, { useState } from 'react';
import { Icon } from './components.jsx';

const EXAMPLES = [
  'Agricultural land in very high flood areas in Dapco',
  'Residential zones outside hazard areas',
  'Commercial suitability',
  'Show the mangrove reforestation sites',
];

/**
 * "Ask the map": a plain-language question is turned into map filters by Gemini (structured output,
 * validated on the server). The parent applies the result to the map.
 */
export function AskTheMap({ onResult, initialResult = null }) {
  const [question, setQuestion] = useState(initialResult?.question ?? '');
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(initialResult);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);

  async function ask(text = question) {
    const q = text.trim();
    if (q.length < 3 || asking) return;
    setQuestion(q);
    setAsking(true);
    setError('');
    try {
      const res = await fetch('/api/map/interpret', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? `The AI could not read the question (HTTP ${res.status}).`);
      setResult(body.data);
      if (body.data.understood) onResult(body.data);
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setAsking(false);
    }
  }

  function clear() {
    setResult(null);
    setError('');
    setQuestion('');
  }

  // Hidden: only a small pill stays on the map to bring the bar back (the question and answer are kept)
  if (hidden) {
    return (
      <button onClick={() => setHidden(false)} className="chip" title="Show Ask the map" style={{ background: 'hsl(var(--card))', boxShadow: 'var(--shadow-float)', fontWeight: 500 }}>
        <Icon name="bot" size={13} style={{ color: 'hsl(var(--muted-foreground))' }}/> Ask the map
      </button>
    );
  }

  return (
    <div style={{ width: 'min(560px, calc(100% - 32px))' }}>
      <form onSubmit={e => { e.preventDefault(); ask(); }} className="row" style={{
        gap: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10,
        padding: '5px 5px 5px 12px', boxShadow: 'var(--shadow-float)',
      }}>
        <Icon name="bot" size={15} style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}/>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask the map… e.g. agricultural land in flood areas in Dapco"
          maxLength={500}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, color: 'hsl(var(--foreground))' }}
        />
        <button type="submit" disabled={asking || question.trim().length < 3} style={{
          border: 'none', borderRadius: 7, height: 30, padding: '0 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          background: 'hsl(var(--brand))', color: 'white', opacity: asking || question.trim().length < 3 ? 0.6 : 1,
        }}>
          {asking ? 'Reading…' : 'Ask'}
        </button>
        <button type="button" onClick={() => setHidden(true)} title="Hide Ask the map" aria-label="Hide Ask the map" style={{
          border: 'none', background: 'none', borderRadius: 6, width: 26, height: 30, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))',
        }}>
          <Icon name="x" size={14}/>
        </button>
      </form>

      {(result || error) && (
        <div style={{ marginTop: 6, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, boxShadow: 'var(--shadow-float)' }}>
          <div className="row-between" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div style={{ lineHeight: 1.5 }}>
              {error && <span style={{ color: 'hsl(var(--destructive))' }}>{error}</span>}
              {result && !result.understood && (
                <span>That doesn&apos;t look like a question about the Panabo City map. Try asking for zones, barangays, hazards or suitability.</span>
              )}
              {result?.understood && (
                <>
                  <span style={{ fontWeight: 600 }}>AI understood: </span>{result.explanation}
                  {result.ignored?.length > 0 && <div className="muted" style={{ fontSize: 11 }}>Not found in TerraSpec data, ignored: {result.ignored.join(', ')}</div>}
                  {result.note && <div className="muted" style={{ fontSize: 11 }}>{result.note}</div>}
                  <div className="muted mono" style={{ fontSize: 10.5 }}>Read by {result.model}{result.fallback_used ? ' (backup model)' : ''}</div>
                </>
              )}
            </div>
            <button onClick={clear} title="Clear" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 2 }}>
              <Icon name="x" size={13}/>
            </button>
          </div>
        </div>
      )}

      {!result && !error && !asking && question === '' && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6, justifyContent: 'center' }}>
          {EXAMPLES.map(example => (
            <button key={example} onClick={() => ask(example)} className="chip" style={{ background: 'hsl(var(--card))', boxShadow: 'var(--shadow-float)' }}>{example}</button>
          ))}
        </div>
      )}
    </div>
  );
}
