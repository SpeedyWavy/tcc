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
  const importMatch = text.match(/^(\s*@(import)[^\n]*\n)+/m);
  const logoMatch = text.match(/(\.logo\s*\{[\s\S]*?\})/);
  if (importMatch && logoMatch && text.indexOf(logoMatch[0]) < text.indexOf(importMatch[0])) {
    text = text.replace(logoMatch[0], '');
    const insertPos = text.indexOf(importMatch[0]) + importMatch[0].length;
    text = text.slice(0, insertPos) + '\n' + logoMatch[0].trim() + '\n' + text.slice(insertPos);
    fs.writeFileSync(file, text, 'utf8');
    console.log('Reordered imports/logo in', rel);
    changed += 1;
  }
}
console.log('Total files updated:', changed);
