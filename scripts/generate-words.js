const fs = require('fs');

const count = parseInt(process.argv[2]) || 20;
const outFile = process.argv[3] || 'words.txt';

const consonants = 'bcdfghjklmnprstvwz';
const vowels = 'aeiou';

function randomChar(str) {
  return str[Math.floor(Math.random() * str.length)];
}

function generateWord() {
  const syllables = Math.floor(Math.random() * 3) + 1;
  let word = '';
  for (let i = 0; i < syllables; i++) {
    word += randomChar(consonants) + randomChar(vowels);
    if (Math.random() > 0.5) word += randomChar(consonants);
  }
  return word;
}

const words = Array.from({ length: count }, generateWord);
fs.writeFileSync(outFile, words.join('\n') + '\n');
console.log(`✅ ${count} mots écrits dans ${outFile}`);
