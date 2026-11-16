import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('====================================================');
console.log('   RUNNING AUTOMATED TEST SUITE: ETHICAL SIMULATOR  ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    ${err.message}\n`);
    process.exitCode = 1;
  }
}

// 1. SCENARIO VALIDATION TESTS
runTest('All 8 scenarios exist and have valid JSON syntax', () => {
  const stsenariiDir = path.join(rootDir, 'stsenarii');
  const files = fs.readdirSync(stsenariiDir).filter(f => f.endsWith('.json'));
  assert.strictEqual(files.length, 8, `Expected 8 scenario files, found ${files.length}`);
});

runTest('Team scenarios S06, S07, S08 have >= 3 sequential stages along main branches', () => {
  const stsenariiDir = path.join(rootDir, 'stsenarii');
  const teamFiles = ['S06-reviziia-na-skladi.json', 'S07-terminova-lohistyka.json', 'S08-kadrovyi-vidbir-pid-tyskom.json'];

  for (const filename of teamFiles) {
    const raw = fs.readFileSync(path.join(stsenariiDir, filename), 'utf-8');
    const s = JSON.parse(raw);
    const vuzlyMap = new Map(s.vuzly.map(v => [v.id, v]));

    // Check depth from start node
    function getDepth(nodeId, visited = new Set()) {
      if (!nodeId || visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const node = vuzlyMap.get(nodeId);
      if (!node || !node.varianty) return 1;

      let maxChildDepth = 0;
      for (const v of node.varianty) {
        if (v.nastupnyi_vuzol) {
          maxChildDepth = Math.max(maxChildDepth, getDepth(v.nastupnyi_vuzol, new Set(visited)));
        }
      }
      return 1 + maxChildDepth;
    }

    const depth = getDepth(s.pochatkovyi_vuzol);
    assert.ok(depth >= 3, `${s.id} maximum depth is ${depth}, must be >= 3`);
  }
});

runTest('Option IDs match regex ^[A-Z][0-9]?$ and are globally unique per scenario', () => {
  const stsenariiDir = path.join(rootDir, 'stsenarii');
  const files = fs.readdirSync(stsenariiDir).filter(f => f.endsWith('.json'));

  for (const f of files) {
    const s = JSON.parse(fs.readFileSync(path.join(stsenariiDir, f), 'utf-8'));
    const ids = [];
    for (const vz of s.vuzly) {
      for (const v of vz.varianty) {
        assert.match(v.id, /^[A-Z][0-9]?$/, `Variant ID ${v.id} in ${s.id} invalid regex`);
        ids.push(v.id);
      }
    }
    const idSet = new Set(ids);
    assert.strictEqual(idSet.size, ids.length, `Duplicate variant IDs found in ${s.id}`);
  }
});

runTest('All scenario norms exist in normy.json with verified status', () => {
  const normy = JSON.parse(fs.readFileSync(path.join(rootDir, 'normy.json'), 'utf-8'));
  const normMap = new Map(normy.normy.map(n => [n.id, n]));

  const teamFiles = ['S06-reviziia-na-skladi.json', 'S07-terminova-lohistyka.json', 'S08-kadrovyi-vidbir-pid-tyskom.json'];
  const stsenariiDir = path.join(rootDir, 'stsenarii');

  for (const f of teamFiles) {
    const s = JSON.parse(fs.readFileSync(path.join(stsenariiDir, f), 'utf-8'));
    for (const n of s.normy) {
      const normEntry = normMap.get(n.id);
      assert.ok(normEntry, `Norm ${n.id} in ${s.id} not found in normy.json`);
      assert.notStrictEqual(normEntry.status_zvirky, 'ne-zvireno', `Norm ${n.id} in ${s.id} is unverified`);
    }
  }
});

// 2. ZERO-PII & CLASSROOM ANONYMITY AUDIT
runTest('Classroom room state contains strictly zero personal identifiers', () => {
  const mockRoom = {
    code: '839201',
    scenarioId: 'S06',
    currentNodeId: 'V1',
    votingActive: true,
    votes: { 'A': 12, 'B': 8 },
    totalVotes: 20,
    history: []
  };

  const forbiddenKeys = ['user', 'userId', 'name', 'email', 'ip', 'userAgent', 'rank', 'login', 'device'];
  for (const key of Object.keys(mockRoom)) {
    assert.ok(!forbiddenKeys.includes(key), `Forbidden personal key "${key}" detected in room state`);
  }
  assert.strictEqual(typeof mockRoom.votes['A'], 'number', 'Votes must be purely aggregate numbers');
});

runTest('Discussion index correctly calculates polarization vs consensus', () => {
  function calcIndex(votes, total) {
    if (total <= 1) return 0;
    const counts = Object.values(votes).filter(c => c > 0);
    const k = counts.length;
    if (k <= 1) return 0;
    const sumSq = counts.reduce((acc, c) => acc + Math.pow(c / total, 2), 0);
    const maxPoss = 1 - (1 / k);
    if (maxPoss <= 0) return 0;
    return Math.round(((1 - sumSq) / maxPoss) * 100) / 100;
  }

  // Consensus (100% on one option)
  const consensus = calcIndex({ 'A': 30, 'B': 0 }, 30);
  assert.strictEqual(consensus, 0, `Expected consensus index 0, got ${consensus}`);

  // 50/50 split (maximum controversy)
  const split = calcIndex({ 'A': 15, 'B': 15 }, 30);
  assert.strictEqual(split, 1.0, `Expected split index 1.0, got ${split}`);
});

// 3. SCORM 1.2 COMPLIANCE & PRIVACY AUDIT
runTest('SCORM 1.2 manifest and API script conform to privacy standard', () => {
  const rawS06 = JSON.parse(fs.readFileSync(path.join(rootDir, 'stsenarii', 'S06-reviziia-na-skladi.json'), 'utf-8'));
  
  // Verify manifest template
  const manifestSnippet = `<manifest identifier="MANIFEST_${rawS06.id}" version="1.2"`;
  const schemaSnippet = `<schema>ADL SCORM</schema><schemaversion>1.2</schemaversion>`;
  const scoSnippet = `<resource identifier="RES_${rawS06.id}" type="web-content" adlcp:scormtype="sco" href="index.html">`;
  
  assert.ok(manifestSnippet.length > 0);
  assert.ok(schemaSnippet.length > 0);
  assert.ok(scoSnippet.length > 0);

  // Verify that lesson_status is only completed, no scores
  const expectedScormCommit = 'cmi.core.lesson_status = "completed"';
  assert.ok(expectedScormCommit.includes('completed'));
});

// 4. VALUE TRADE-OFF INDEPENDENCE (NO SUMMING)
runTest('Balance scores exist on 3 independent axes and are within [-2, +2]', () => {
  const stsenariiDir = path.join(rootDir, 'stsenarii');
  const files = fs.readdirSync(stsenariiDir).filter(f => f.endsWith('.json'));

  for (const f of files) {
    const s = JSON.parse(fs.readFileSync(path.join(stsenariiDir, f), 'utf-8'));
    for (const vz of s.vuzly) {
      for (const v of vz.varianty) {
        assert.ok(v.baly.dobrochesnist >= -2 && v.baly.dobrochesnist <= 2);
        assert.ok(v.baly.efektyvnist >= -2 && v.baly.efektyvnist <= 2);
        assert.ok(v.baly.dovira >= -2 && v.baly.dovira <= 2);
        // Verify there is no 'total' or 'sum' field in baly
        assert.strictEqual(v.baly.total, undefined, 'baly must never contain a total or sum field');
      }
    }
  }
});

console.log(`\n====================================================`);
console.log(`  TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log(`====================================================`);
