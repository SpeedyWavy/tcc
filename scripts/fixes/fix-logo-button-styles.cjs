const fs = require('fs');
const path = require('path');

const root = path.resolve('.');
const logoRule = `
.logo {
  width: 180px;
  height: 90px;
  background-image: url('../../assets/logo-rds.png');
  background-repeat: no-repeat;
  background-position: left center;
  background-size: contain;
}
`;

const buttonRules = `
.adicionar{
  width: 100%;
  padding: 2dvh 5% 0;
  box-sizing: border-box;
}

.adicionar-botao{
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: #001355;
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 3px 3px 0px #0000005c;
  margin-left: 15%;
  width: 70%;
  height: 55px;
  margin-top: 4%;
  float: left;
  transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
  font-weight: 750;
  font-size: 20px;
  font-family: "Inter", sans-serif;
  font-style: black;
  text-align: center;
  color: #FFD400;
  box-shadow: 0px 0px 10px 1px #0B0C11A6;
}

#icone-botao{
  margin-left: 10%;
}

.adicionar-botao:hover{
  transform: translateY(-2px);
  box-shadow: 5px 5px 0px #0000005c;
}

.adicionar-botao:active{
  transform: translateY(0);
  box-shadow: 2px 2px 0px #0000005c;
}
`;

const filesToEnsureLogo = [
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

const filesToPatchButtons = [
  'src/admin/css/GerenciarAdministradores.module.css',
  'src/admin/css/GerenciarAlunos.module.css',
  'src/admin/css/GerenciarVeiculos.module.css',
];

function insertLogo(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (/\.logo\s*\{/.test(text)) return false;
  const lines = text.split('\n');
  let insertIndex = 0;
  while (insertIndex < lines.length && lines[insertIndex].trim() === '') insertIndex += 1;
  if (insertIndex > 0 && lines[insertIndex - 1].startsWith('@import')) {
    let i = insertIndex;
    while (i < lines.length && lines[i].trim() === '') i += 1;
    fs.writeFileSync(filePath, lines.slice(0, i).join('\n') + logoRule + lines.slice(i).join('\n'), 'utf8');
  } else {
    fs.writeFileSync(filePath, logoRule + lines.join('\n'), 'utf8');
  }
  return true;
}

function patchButtons(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  const adicionarRegex = /\.adicionar\s*\{[\s\S]*?\n\}/;
  const adicionarBotaoRegex = /\.adicionar-botao\s*\{[\s\S]*?\n\}/;
  const iconRegex = /#icone-botao\s*\{[\s\S]*?\n\}/;
  let updated = false;
  if (adicionarRegex.test(text)) {
    text = text.replace(adicionarRegex, buttonRules.trim().split('\n\n')[0] + '\n}');
    updated = true;
  }
  if (adicionarBotaoRegex.test(text)) {
    const buttonBlock = buttonRules.trim().split('\n\n').slice(1).join('\n\n');
    text = text.replace(adicionarBotaoRegex, buttonBlock);
    updated = true;
  }
  if (!iconRegex.test(text)) {
    text = text.replace(/(\.adicionar-botao:active\s*\{[\s\S]*?\n\})/, `$1\n\n#icone-botao{\n  margin-left: 10%;\n}`);
    updated = true;
  }
  if (updated) {
    fs.writeFileSync(filePath, text, 'utf8');
  }
  return updated;
}

let total = 0;
for (const relative of filesToEnsureLogo) {
  const absolute = path.join(root, relative);
  if (insertLogo(absolute)) {
    console.log('Inserted .logo into', relative);
    total += 1;
  }
}
for (const relative of filesToPatchButtons) {
  const absolute = path.join(root, relative);
  if (patchButtons(absolute)) {
    console.log('Patched button styles in', relative);
    total += 1;
  }
}
console.log('Total files modified:', total);
