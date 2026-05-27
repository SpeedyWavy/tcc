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

const buttonBlock = `
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

const logos = [
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

const buttons = [
  'src/admin/css/GerenciarAdministradores.module.css',
  'src/admin/css/GerenciarAlunos.module.css',
  'src/admin/css/GerenciarVeiculos.module.css',
];

function ensureLogo(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  if (/\.logo\s*\{/.test(text)) return false;
  const importMatch = text.match(/^(\s*@import[^\n]*\n\s*)+/);
  if (importMatch) {
    const afterImports = importMatch[0].length;
    text = text.slice(0, afterImports) + logoRule + text.slice(afterImports);
  } else {
    text = logoRule + text;
  }
  fs.writeFileSync(filePath, text, 'utf8');
  return true;
}

function patchButtons(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  const original = text;
  // remove existing adicionar/button blocks and icon rules
  text = text.replace(/\.adicionar\s*\{[\s\S]*?\n\}/g, '');
  text = text.replace(/\.adicionar-botao\s*\{[\s\S]*?\n\}/g, '');
  text = text.replace(/#icone-botao\s*\{[\s\S]*?\n\}/g, '');
  // insert block near top after imports or after .voltar block if exists
  const importMatch = text.match(/^(\s*@import[^\n]*\n\s*)+/);
  if (importMatch) {
    const pos = importMatch[0].length;
    text = text.slice(0, pos) + buttonBlock + '\n' + text.slice(pos);
  } else {
    text = buttonBlock + '\n' + text;
  }
  // cleanup extra blank lines
  text = text.replace(/\n{3,}/g, '\n\n');
  if (text !== original) {
    fs.writeFileSync(filePath, text, 'utf8');
    return true;
  }
  return false;
}

let changed = 0;
for (const relative of logos) {
  const file = path.join(root, relative);
  if (ensureLogo(file)) {
    console.log('Added logo to', relative);
    changed += 1;
  }
}
for (const relative of buttons) {
  const file = path.join(root, relative);
  if (patchButtons(file)) {
    console.log('Patched buttons in', relative);
    changed += 1;
  }
}
console.log('Done, files changed:', changed);
