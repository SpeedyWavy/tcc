const fs = require('fs');
const path = require('path');

const root = path.resolve('.');
const files = [
  'src/admin/css/App.module.css',
  'src/admin/css/Mais.module.css',
  'src/admin/css/GerenciarAdministradores.module.css',
  'src/admin/css/GerenciarAlunos.module.css',
  'src/admin/css/GerenciarMotoristas.module.css',
  'src/admin/css/GerenciarRevisoes.module.css',
  'src/admin/css/GerenciarRotas.module.css',
  'src/admin/css/GerenciarVeiculos.module.css',
  'src/motorista/css/Alunos.module.css',
  'src/motorista/css/Inicial.module.css',
];
let changed = 0;
for (const rel of files) {
  const file = path.join(root, rel);
  let text = fs.readFileSync(file, 'utf8');
  const imports = text.match(/@import[^;]*;/g);
  if (!imports) continue;
  const withoutImports = text.replace(/@import[^;]*;/g, '').trimStart();
  const newText = imports.join('\n') + '\n\n' + withoutImports;
  if (newText !== text) {
    fs.writeFileSync(file, newText, 'utf8');
    console.log('Moved imports to top in', rel);
    changed += 1;
  }
}
console.log('Files changed:', changed);
