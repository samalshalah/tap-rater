import { spawn } from 'node:child_process';
process.loadEnvFile('.env.local');
const source = new URL(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
const target = new URL(source);
target.hostname = 'ep-holy-bonus-atnws6yy.c-9.us-east-1.aws.neon.tech';
if (source.hostname === target.hostname) throw new Error('Refusing current application database');
const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/integration', '--reporter=dot'], {
  stdio: 'inherit', windowsHide: true, env: { ...process.env, PHASE1_DATABASE_URL: target.toString(), PHASE1_DATABASE_HOST: target.hostname, PHASE1_ALLOW_DATABASE_WRITES: 'yes' },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
