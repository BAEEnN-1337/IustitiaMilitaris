const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const scenarioFiles = fs.readdirSync(path.join(root, 'stsenarii')).filter(f => f.endsWith('.json')).sort();
const scenarios = scenarioFiles.map(f => JSON.parse(fs.readFileSync(path.join(root, 'stsenarii', f), 'utf8')));
const englishScenarios = require('../src/i18n/scenarios.en.json');
function route(scenario, firstIndex = 0) {
  const steps = [], seen = new Set();
  let node = scenario.vuzly.find(n => n.id === scenario.pochatkovyi_vuzol);
  while (node) {
    if (seen.has(node.id)) throw Error('Cycle in ' + scenario.id);
    seen.add(node.id);
    const variant = node.varianty[steps.length ? 0 : firstIndex];
    steps.push({ nodeId: node.id, variantId: variant.id });
    node = scenario.vuzly.find(n => n.id === variant.nastupnyi_vuzol);
  }
  return steps;
}
module.exports = { root, scenarioFiles, scenarios, englishScenarios, route };
