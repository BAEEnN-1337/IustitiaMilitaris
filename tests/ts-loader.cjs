const fs = require('node:fs'), ts = require('typescript');
// Exercise the production TypeScript modules from Node without a second build tree.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  });
  module._compile(outputText, filename);
};
module.exports = filename => require(filename);
