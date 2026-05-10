export const log = (msg) => process.stdout.write(`  ${msg}\n`);
export const fail = (msg) => {
  process.stderr.write(`  ❌  ${msg}\n`);
  process.exit(1);
};
