export const USER_INTERFACE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cancer Registry Abstraction Harness</title>
  <style>
    :root { --ink:#17201b; --paper:#f4f1e8; --panel:#fffdf7; --line:#c9c5b8; --accent:#b53a2d; --teal:#176b68; --muted:#686b64; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:var(--paper); font-family:"Aptos","Segoe UI",sans-serif; }
    header { border-bottom:1px solid var(--line); background:var(--ink); color:white; }
    .header-inner, main { width:min(1120px,calc(100% - 32px)); margin:auto; }
    .header-inner { min-height:112px; display:flex; align-items:center; justify-content:space-between; gap:24px; }
    h1 { margin:0; max-width:720px; font-family:Georgia,serif; font-size:clamp(28px,4vw,48px); font-weight:500; letter-spacing:0; }
    .eyebrow { color:#aad4cb; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; }
    main { padding:30px 0 64px; display:grid; grid-template-columns:minmax(300px,420px) 1fr; gap:40px; }
    h2 { font-family:Georgia,serif; font-size:22px; font-weight:500; letter-spacing:0; }
    .case-list { border-top:2px solid var(--ink); }
    .case { display:grid; grid-template-columns:24px 1fr; gap:12px; padding:18px 4px; border-bottom:1px solid var(--line); cursor:pointer; }
    .case:hover { background:#ebe7db; }
    .case strong { display:block; margin-bottom:5px; }
    .case small { color:var(--muted); line-height:1.45; }
    input[type=radio] { accent-color:var(--accent); width:17px; height:17px; }
    textarea { width:100%; min-height:94px; resize:vertical; border:1px solid var(--line); border-radius:4px; padding:12px; background:var(--panel); color:var(--ink); font:inherit; }
    button { min-height:42px; border:0; border-radius:4px; padding:0 18px; background:var(--accent); color:white; font-weight:700; cursor:pointer; }
    button:disabled { background:#9a9b95; cursor:not-allowed; }
    .actions { display:flex; align-items:center; gap:14px; margin-top:14px; }
    #status { color:var(--muted); font-size:14px; }
    .result { min-height:420px; border-left:1px solid var(--line); padding-left:40px; }
    .empty { color:var(--muted); max-width:460px; margin-top:90px; line-height:1.6; }
    .summary { border-top:4px solid var(--teal); background:var(--panel); padding:22px; }
    .summary h3 { margin:20px 0 8px; }
    .summary h3:first-child { margin-top:0; }
    .summary ul { padding-left:20px; }
    details { margin-top:18px; border-top:1px solid var(--line); padding-top:14px; }
    pre { overflow:auto; max-height:440px; padding:14px; background:#202722; color:#e6eee8; font-size:12px; }
    @media (max-width:760px) { .header-inner { min-height:128px; } main { grid-template-columns:1fr; } .result { border-left:0; border-top:1px solid var(--line); padding:24px 0 0; } }
  </style>
</head>
<body>
  <header><div class="header-inner"><div><div class="eyebrow">Synthetic records only</div><h1>Cancer Registry Abstraction Harness</h1></div></div></header>
  <main>
    <section aria-labelledby="cases-title">
      <h2 id="cases-title">1. Select a case</h2>
      <div id="cases" class="case-list" aria-live="polite">Loading available cases...</div>
      <h2>2. Set the review question</h2>
      <textarea id="question">Prepare a draft cancer registry abstraction for certified registrar review.</textarea>
      <div class="actions"><button id="run" disabled>Run all</button><span id="status">Select one case to continue.</span></div>
    </section>
    <section class="result" aria-labelledby="result-title">
      <h2 id="result-title">Draft abstraction</h2>
      <div id="output" class="empty">Results will appear here with evidence citations, unresolved fields, and registrar actions.</div>
    </section>
  </main>
  <script>
    const casesElement = document.querySelector('#cases');
    const runButton = document.querySelector('#run');
    const statusElement = document.querySelector('#status');
    const outputElement = document.querySelector('#output');
    let selectedCaseId = null;

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));
    const list = (items) => items?.length ? '<ul>' + items.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '<p>None documented.</p>';

    fetch('/api/v1/registry/cases').then(response => response.json()).then(({ cases }) => {
      casesElement.textContent = '';
      cases.forEach(item => {
        const label = document.createElement('label');
        label.className = 'case';
        label.innerHTML = '<input type="radio" name="case" value="' + escapeHtml(item.caseId) + '"><span><strong>' + escapeHtml(item.displayName) + '</strong><small>' + escapeHtml(item.description) + '</small></span>';
        label.querySelector('input').addEventListener('change', () => { selectedCaseId = item.caseId; runButton.disabled = false; statusElement.textContent = 'Ready to run selected case.'; });
        casesElement.append(label);
      });
    }).catch(() => { casesElement.textContent = 'Case catalog is unavailable.'; });

    runButton.addEventListener('click', async () => {
      if (!selectedCaseId) return;
      runButton.disabled = true;
      statusElement.textContent = 'Running seven agents...';
      outputElement.className = 'empty';
      outputElement.textContent = 'Analyzing cited evidence.';
      try {
        const response = await fetch('/api/v1/registry/abstract', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ requestId:crypto.randomUUID(), caseId:selectedCaseId, question:document.querySelector('#question').value, testInput:null, instructionSet:null, executionMode:'baseline' }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Execution failed');
        const tumor = data.tumors[0] || {};
        outputElement.className = 'summary';
        outputElement.innerHTML = '<h3>Reportability</h3><p><strong>' + escapeHtml(data.reportability.recommendation) + '</strong><br>' + escapeHtml(data.reportability.rationale) + '</p>' +
          '<h3>Tumor identity</h3><p>' + escapeHtml(tumor.identity || 'Unresolved') + '</p>' +
          '<h3>Primary site</h3><p>' + escapeHtml(tumor.primarySite || 'Unresolved') + '</p>' +
          '<h3>Conflicts</h3>' + list(data.conflicts) + '<h3>Missing evidence</h3>' + list(data.missingEvidence) +
          '<h3>Registrar actions</h3>' + list(data.registrarActions) + '<h3>Sources</h3>' + list(data.citations.map(citation => citation.documentId + ' (' + citation.documentVersion + ', ' + citation.effectiveDate + ')')) +
          '<details><summary>Technical response</summary><pre>' + escapeHtml(JSON.stringify(data,null,2)) + '</pre></details>';
        statusElement.textContent = 'Draft ready for registrar review.';
      } catch (error) { outputElement.className = 'empty'; outputElement.textContent = error.message; statusElement.textContent = 'Run failed.'; }
      finally { runButton.disabled = !selectedCaseId; }
    });
  </script>
</body>
</html>`;