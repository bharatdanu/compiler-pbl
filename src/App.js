import React, { useMemo, useState } from 'react';
import './App.css';
import { tokenize } from './lexer';

function formatTokens(tokens) {
  return tokens.map((t, idx) => ({ ...t, id: `${t.type}-${t.line}-${t.col}-${idx}` }));
}

function LexTable({ title, rows, emptyMessage }) {
  return (
    <section className="panel">
      <h2 className="panelTitle">{title}</h2>
      {rows.length === 0 ? (
        <div className="empty">{emptyMessage}</div>
      ) : (
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                {Object.keys(rows[0]).filter((k) => k !== 'id').map((key) => (
                  <th key={key}>{key.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {Object.keys(r)
                    .filter((k) => k !== 'id')
                    .map((k) => (
                      <td key={k}>{String(r[k])}</td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [code, setCode] = useState('');
  const [analysis, setAnalysis] = useState({ tokens: [], errors: [], symbolTable: [] });
  const [fileName, setFileName] = useState('');

  const tokensRows = useMemo(() => formatTokens(analysis.tokens), [analysis.tokens]);
  const errorRows = useMemo(
    () => analysis.errors.map((e, idx) => ({ ...e, id: `err-${e.line}-${e.col}-${idx}` })),
    [analysis.errors]
  );
  const symbolRows = useMemo(
    () =>
      analysis.symbolTable.map((s, idx) => ({
        ...s,
        id: `sym-${s.lexeme}-${s.firstLine}-${s.firstCol}-${idx}`,
      })),
    [analysis.symbolTable]
  );

  function handleAnalyze() {
    const input = code ?? '';
    const result = tokenize(input);
    setAnalysis(result);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const text = await file.text();
    setCode(text);

    // Optional: auto-analyze after upload
    const result = tokenize(text);
    setAnalysis(result);
  }

  return (
    <div className="appRoot">
      <header className="header">
        <div>
          <h1 className="title">Lexical Analyzer</h1>
          <p className="subtitle">Upload a file or paste code. Get tokens, error table, and symbol table.</p>
        </div>
      </header>

      <main className="layout">
        <section className="editorPanel">
          <h2 className="panelTitle">Input</h2>

          <div className="controls">
            <label className="fileLabel">
              Upload Code File
              <input type="file" accept="text/*" onChange={handleFileUpload} />
            </label>
            {fileName ? <div className="fileName">{fileName}</div> : null}

            <button className="btn" onClick={handleAnalyze} disabled={(code ?? '').trim().length === 0}>
              Analyze
            </button>
          </div>

          <textarea
            className="codeArea"
            spellCheck={false}
            value={code}
            placeholder={`Paste your code here...\n\nExample:\nint main() {\n  int x = 10;\n  return x + 1;\n}`}
            onChange={(e) => setCode(e.target.value)}
          />
        </section>

        <section className="results">
          <LexTable
            title="Tokens"
            rows={tokensRows}
            emptyMessage="No tokens yet. Upload a file or click Analyze."
          />

          <LexTable
            title="Errors"
            rows={errorRows}
            emptyMessage="No lexical errors detected."
          />

          <LexTable
            title="Symbol Table (Identifiers)"
            rows={symbolRows}
            emptyMessage="No identifiers found."
          />
        </section>
      </main>
    </div>
  );
}

