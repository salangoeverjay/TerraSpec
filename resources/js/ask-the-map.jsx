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
export function AskTheMap({ onResult }) {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

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

  return (
    <div style={{ width: 'min(560px, calc(100% - 32px))' }}>
      <form onSubmit={e => { e.preventDefault(); ask(); }} className="row" style={{
        gap: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--brand) / 0.45)', borderRadius: 12,
        padding: '6px 6px 6px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.16)',
      }}>
        <Icon name="bot" size={15} style={{ color: 'hsl(var(--brand))', flexShrink: 0 }}/>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask the map… e.g. agricultural land in flood areas in Dapco"
          maxLength={500}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'hsl(var(--foreground))' }}
        />
        <button type="submit" disabled={asking || question.trim().length < 3} style={{
          border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: 'hsl(var(--brand))', color: 'white', opacity: asking || question.trim().length < 3 ? 0.6 : 1,
        }}>
          {asking ? 'Reading…' : 'Ask'}
        </button>
      </form>

      {(result || error) && (
        <div style={{ marginTop: 6, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
          <div className="row-between" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div style={{ lineHeight: 1.5 }}>
              {error && <span style={{ color: 'hsl(var(--destructive))' }}>{error}</span>}
              {result && !result.understood && (
                <span>That doesn&apos;t look like a question about the Panabo City map. Try asking for zones, barangays, hazards or suitability.</span>
              )}
              {result?.understood && (
                <>
                  <span style={{ fontWeight: 600, color: 'hsl(var(--brand))' }}>AI understood: </span>{result.explanation}
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
            <button key={example} onClick={() => ask(example)} className="chip" style={{ background: 'hsl(var(--background) / 0.92)', fontSize: 11 }}>{example}</button>
          ))}
        </div>
      )}
    </div>
  );
}
