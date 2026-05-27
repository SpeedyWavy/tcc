const fs = require('fs');
const path = require('path');

const root = path.resolve('.');
const files = [
  'src/admin/css/GerenciarAdministradores.module.css',
  'src/admin/css/GerenciarAlunos.module.css',
  'src/admin/css/GerenciarMotoristas.module.css',
  'src/motorista/css/Alunos.module.css',
  'src/motorista/css/Inicial.module.css',
];
const expectedImport = "@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap');\n\n";
const brokenPrefix = "@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;";
const brokenSuffix = "1,14..32,100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap');";
let changed = 0;
for (const rel of files) {
  const file = path.join(root, rel);
  let text = fs.readFileSync(file, 'utf8');
  const regex = new RegExp(`${brokenPrefix}[\s\S]*?${brokenSuffix}`);
  if (regex.test(text)) {
    text = text.replace(regex, expectedImport);
    fs.writeFileSync(file, text, 'utf8');
    console.log('Fixed import in', rel);
    changed += 1;
  }
}
console.log('Done, files changed:', changed);
