import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const inputFile = process.argv[2] ?? 'src/styles/theme/_theme.scss';
const outputFile = process.argv[3] ?? '.vscode/mat-tailwind.code-snippets';

const UTILITIES = [
  ['bg', 'background-color'],
  ['text', 'color'],
  ['decoration', 'text-decoration-color'],
  ['border', 'border-color'],
  ['outline', 'outline-color'],
  ['shadow', 'box-shadow color'],
  ['inset-shadow', 'inset box-shadow color'],
  ['ring', 'ring color'],
  ['inset-ring', 'inset ring color'],
  ['accent', 'accent-color'],
  ['caret', 'caret-color'],
  ['fill', 'SVG fill'],
  ['stroke', 'SVG stroke'],
];

function parseThemeColors(css) {
  const themeMatch = css.match(/@theme\s*\{([\s\S]*?)\}/);
  if (!themeMatch) {
    console.error('No @theme block found in', inputFile);
    process.exit(1);
  }

  const themeBlock = themeMatch[1];
  const colors = [];
  const re = /--color-([\w-]+)\s*:\s*var\(--([\w-]+)\)/g;
  let m;
  while ((m = re.exec(themeBlock)) !== null) {
    colors.push({ name: m[1], matVar: m[2] });
  }
  return colors;
}

const css = readFileSync(inputFile, 'utf8');
const colors = parseThemeColors(css);

if (colors.length === 0) {
  console.error('No --color-* variables found in @theme block.');
  process.exit(1);
}

const snippets = {};

for (const [util, cssProp] of UTILITIES) {
  for (const { name, matVar } of colors) {
    const key = `mat-tw ${util}-${name}`;
    snippets[key] = {
      scope: 'html,typescript,css,scss',
      prefix: `${util}-${name}`,
      body: [`${util}-${name}`],
      description: `${cssProp}: var(--${matVar})`,
    };
  }
}

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, JSON.stringify(snippets, null, 2) + '\n', 'utf8');

console.log(
  `${colors.length} colors * ${UTILITIES.length} utilities = ${Object.keys(snippets).length} snippets generated`
);
console.log(`  Colors: ${colors.map((c) => c.name).join(', ')}`);
console.log(`  Output: ${outputFile}`);
