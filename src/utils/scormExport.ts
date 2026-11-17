import { caseLabel, stageLabel, variantLabel } from '../i18n/display';
import { Language } from '../i18n';
import { localizeNorms, localizeScenario } from '../i18n/content';
import scormLabels from '../i18n/scorm.json';
import JSZip from 'jszip';
import { Scenario, NormsData } from '../types';

export async function generateScorm12Zip(
  scenario: Scenario,
  normsData: NormsData,
  lang: Language = 'uk'
): Promise<Blob> {
  const zip = new JSZip();
  scenario = localizeScenario(scenario, lang);
  normsData = localizeNorms(normsData, lang);

  // 1. imsmanifest.xml (SCORM 1.2 compliant)
  const manifestXml = `<?xml version="1.0" standalone="no" ?>
<manifest identifier="MANIFEST_${scenario.id}" version="1.2"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG_${scenario.id}">
    <organization identifier="ORG_${scenario.id}">
      <title>${escapeXml(scenario.nazva)}</title>
      <item identifier="ITEM_${scenario.id}" identifierref="RES_${scenario.id}">
        <title>${escapeXml(scenario.nazva)}</title>
        <adlcp:masteryscore>100</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_${scenario.id}" type="web-content" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
      <file href="scorm-api.js" />
    </resource>
  </resources>
</manifest>`;

  zip.file('imsmanifest.xml', manifestXml);

  // 2. scorm-api.js
  const scormApiJs = `/**
 * SCORM 1.2 API Wrapper
 * Strictly adheres to Privacy & Anti-Profiling rules:
 * Transmits ONLY cmi.core.lesson_status = "completed".
 * NEVER transmits choices, scores, or user profiling data.
 */
var findAPITries = 0;
var maxTries = 500;
var scormAPI = null;

function scanForAPI(win) {
  while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
    findAPITries++;
    if (findAPITries > maxTries) return null;
    win = win.parent;
  }
  return win.API;
}

function getAPI() {
  if (scormAPI == null) {
    scormAPI = scanForAPI(window);
    if ((scormAPI == null) && (window.opener != null) && (typeof(window.opener) != "undefined")) {
      scormAPI = scanForAPI(window.opener);
    }
  }
  return scormAPI;
}

window.SCORM_INIT = function() {
  var api = getAPI();
  if (api) {
    api.LMSInitialize("");
    api.LMSSetValue("cmi.core.lesson_status", "incomplete");
    api.LMSCommit("");
  } else {
    console.log("[SCORM Offline/Mock] LMSInitialize called");
  }
};

window.SCORM_COMPLETE = function() {
  var api = getAPI();
  if (api) {
    // Only lesson_status = "completed", strictly zero PII & zero scores
    api.LMSSetValue("cmi.core.lesson_status", "completed");
    api.LMSCommit("");
    api.LMSFinish("");
  } else {
    console.log("[SCORM Offline/Mock] LMS completed status set");
  }
};
`;

  zip.file('scorm-api.js', scormApiJs);

  // 3. Standalone self-contained index.html player
  // Embeds scenario JSON and relevant norm entries
  const relevantNormIds = new Set(scenario.normy.map((n) => n.id));
  const embeddedNorms = normsData.normy.filter((n) =>
    relevantNormIds.has(n.id)
  );

  const standaloneHtml = generateStandaloneHtmlPlayer(
    scenario,
    embeddedNorms,
    lang
  );
  zip.file('index.html', standaloneHtml);

  return await zip.generateAsync({ type: 'blob' });
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function generateStandaloneHtmlPlayer(
  scenario: Scenario,
  embeddedNorms: any[],
  lang: Language
): string {
  const labels = scormLabels[lang];
  const presentation = {
    case: caseLabel(scenario.id, lang),
    stages: Object.fromEntries(
      scenario.vuzly.map((node) => [
        node.id,
        stageLabel(scenario, node.id, lang)
      ])
    ),
    variants: Object.fromEntries(
      scenario.vuzly.map((node) => [
        node.id,
        Object.fromEntries(
          node.varianty.map((v) => [
            v.id,
            variantLabel(scenario, node.id, v.id, lang)
          ])
        )
      ])
    )
  };
  const scenarioJson = JSON.stringify(scenario).replace(/</g, '\\u003c');
  const normsJson = JSON.stringify(embeddedNorms).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="${lang}" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(scenario.nazva)} - ${escapeXml(labels.s0)}</title>
  <script src="scorm-api.js"></script>
  <style>
    :root {
      --bg: #070b14;
      --card: #111b2f;
      --card-border: #223456;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --emerald: #10b981;
      --gold: #f59e0b;
      --danger: #ef4444;
      --indigo: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6; overflow-wrap: anywhere;
      padding: 1rem;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    h1, h2, h3 { color: #fff; margin-bottom: 0.75rem; }
    h1 { font-size: 1.5rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.75rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 1rem;
    }
    .context-box {
      background: rgba(255, 255, 255, 0.03);
      border-left: 4px solid var(--indigo);
      padding: 1rem;
      border-radius: 0 8px 8px 0;
      margin-bottom: 1.25rem;
      font-size: 0.95rem;
    }
    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .btn-option {
      background: #17233c;
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 1rem;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      font-size: 0.95rem;
      transition: all 0.2s;
    }
    .btn-option:hover {
      border-color: var(--emerald);
      background: #1d2c4b;
      transform: translateY(-2px);
    }
    .btn-primary {
      background: var(--emerald);
      color: #070b14;
      font-weight: 700;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 1rem;
      width: 100%;
    }
    .feedback-box {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 8px;
      padding: 1.25rem;
      margin: 1rem 0;
    }
    .scores-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
      margin: 1rem 0;
      text-align: center;
    }
    .score-card {
      background: #0c1424;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.5rem;
    }
    .score-val { font-size: 1.25rem; font-weight: bold; }
    .score-val.pos { color: var(--emerald); }
    .score-val.zero { color: var(--gold); }
    .score-val.neg { color: var(--danger); }
    .disclaimer {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--card-border);
    }
  </style>
</head>
<body>
  <div class="container" id="app">
    <!-- Rendered dynamically by script -->
  </div>

  <script>
    var presentation = ${JSON.stringify(presentation).replace(/</g, '\\u003c')};
    var scenario = ${scenarioJson};
    var norms = ${normsJson};
    var normsMap = {};
    norms.forEach(function(n) { normsMap[n.id] = n; });

    var state = {
      step: 'briefing', // 'briefing', 'node', 'feedback', 'reflection'
      currentNodeId: scenario.pochatkovyi_vuzol,
      pathway: [],
      selectedVariant: null
    };

    window.onload = function() {
      if (window.SCORM_INIT) window.SCORM_INIT();
      render();
    };

    function render() {
      var app = document.getElementById('app');
      if (state.step === 'briefing') {
        app.innerHTML = \`
          <span class="badge">\${presentation.case} • \${scenario.tryvalist_khv} ${escapeXml(labels.s1)} • \${scenario.tema}</span>
          <h1>\${scenario.nazva}</h1>
          <div class="context-box">
            <strong>${escapeXml(labels.s2)}</strong> \${scenario.kontekst}
          </div>
          <div style="margin-bottom: 1.25rem;">
            <h3>${escapeXml(labels.s3)}</h3>
            <p>\${scenario.sytuatsiia}</p>
          </div>
          <button class="btn-primary" onclick="startScenario()">${escapeXml(labels.s4)}</button>
          <div class="disclaimer">
            ${escapeXml(labels.s5)}
          </div>
        \`;
      } else if (state.step === 'node') {
        var node = scenario.vuzly.find(function(v) { return v.id === state.currentNodeId; });
        var optionsHtml = node.varianty.map(function(varItem) {
          return \`<button class="btn-option" onclick="chooseOption('\${varItem.id}')">
            <strong>\${presentation.variants[node.id][varItem.id]}.</strong> \${varItem.tekst}
          </button>\`;
        }).join('');

        app.innerHTML = \`
          <span class="badge">\${presentation.stages[node.id]}</span>
          <h2>\${node.zapytannia}</h2>
          \${node.tekst ? '<p style="margin-bottom: 1rem; color: var(--text-muted);">' + node.tekst + '</p>' : ''}
          <div class="options-grid">
            \${optionsHtml}
          </div>
        \`;
      } else if (state.step === 'feedback') {
        var v = state.selectedVariant;
        function formatScore(num) { return num > 0 ? '+' + num : '' + num; }
        function scoreClass(num) { return num > 0 ? 'pos' : (num === 0 ? 'zero' : 'neg'); }

        app.innerHTML = \`
          <span class="badge">${escapeXml(labels.s7)} \${presentation.variants[state.currentNodeId][v.id]}</span>
          <h2>${escapeXml(labels.s8)}</h2>
          <div class="scores-row">
            <div class="score-card">
              <div style="font-size:0.8rem;color:var(--text-muted)">${escapeXml(labels.s9)}</div>
              <div class="score-val \${scoreClass(v.baly.dobrochesnist)}">\${formatScore(v.baly.dobrochesnist)}</div>
            </div>
            <div class="score-card">
              <div style="font-size:0.8rem;color:var(--text-muted)">${escapeXml(labels.s10)}</div>
              <div class="score-val \${scoreClass(v.baly.efektyvnist)}">\${formatScore(v.baly.efektyvnist)}</div>
            </div>
            <div class="score-card">
              <div style="font-size:0.8rem;color:var(--text-muted)">${escapeXml(labels.s11)}</div>
              <div class="score-val \${scoreClass(v.baly.dovira)}">\${formatScore(v.baly.dovira)}</div>
            </div>
          </div>
          <div class="feedback-box">
            <p><strong>${escapeXml(labels.s12)}</strong> \${v.naslidky.odrazu}</p>
            <p style="margin-top: 0.5rem;"><strong>${escapeXml(labels.s13)}</strong> \${v.naslidky.vidkladeni}</p>
          </div>
          <p style="margin: 1rem 0; font-size: 0.95rem;"><strong>${escapeXml(labels.s14)}</strong> \${v.chomu_taki_baly}</p>
          <div class="context-box">
            <strong>${escapeXml(labels.s15)}</strong> \${v.zvorotnyi_zviazok}
          </div>
          <button class="btn-primary" onclick="nextStage()">\${v.nastupnyi_vuzol ? ${JSON.stringify(labels.s16)} : ${JSON.stringify(labels.s17)}}</button>
        \`;
      } else if (state.step === 'reflection') {
        if (window.SCORM_COMPLETE) window.SCORM_COMPLETE();
        var stepsList = state.pathway.map(function(p, idx) {
          return '<li>' + presentation.stages[p.nodeId] + ' · ${escapeXml(labels.s19)} ' + presentation.variants[p.nodeId][p.variant.id] + ' — ' + p.variant.tekst + '</li>';
        }).join('');

        app.innerHTML = \`
          <span class="badge" style="background:rgba(16,185,129,0.2)">${escapeXml(labels.s20)}</span>
          <h1>${escapeXml(labels.s21)}</h1>
          <div class="context-box" style="margin-top:1rem;">
            <h3>${escapeXml(labels.s22)}</h3>
            <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">\${stepsList}</ul>
          </div>
          <div style="margin: 1.5rem 0;">
            <h3>${escapeXml(labels.s23)}</h3>
            <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
              \${scenario.porady.map(function(p) { return '<li>' + p + '</li>'; }).join('')}
            </ul>
          </div>
          <div class="feedback-box">
            <strong>${escapeXml(labels.s24)}</strong><br>
            ${escapeXml(labels.s25)}
          </div>
          <button class="btn-primary" onclick="restart()">${escapeXml(labels.s26)}</button>
        \`;
      }
    }

    function startScenario() {
      state.step = 'node';
      state.currentNodeId = scenario.pochatkovyi_vuzol;
      state.pathway = [];
      render();
    }

    function chooseOption(varId) {
      var node = scenario.vuzly.find(function(v) { return v.id === state.currentNodeId; });
      var variant = node.varianty.find(function(v) { return v.id === varId; });
      state.selectedVariant = variant;
      state.pathway.push({ nodeId: node.id, variant: variant });
      state.step = 'feedback';
      render();
    }

    function nextStage() {
      if (state.selectedVariant && state.selectedVariant.nastupnyi_vuzol) {
        state.currentNodeId = state.selectedVariant.nastupnyi_vuzol;
        state.step = 'node';
      } else {
        state.step = 'reflection';
      }
      render();
    }

    function restart() {
      state.step = 'briefing';
      state.currentNodeId = scenario.pochatkovyi_vuzol;
      state.pathway = [];
      state.selectedVariant = null;
      render();
    }
  </script>
</body>
</html>`;
}
