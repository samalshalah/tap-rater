import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

process.loadEnvFile('.env.local');
const url = new URL(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
url.hostname = 'ep-holy-bonus-atnws6yy.c-9.us-east-1.aws.neon.tech';
process.env.DATABASE_URL = url.toString();
process.env.NEON_DATABASE_URL = url.toString();
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.STRIPE_MODE = 'test';
process.env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3031';
process.env.NEXT_PUBLIC_ACCOUNT_APP_URL = 'http://127.0.0.1:3031';
// Local sessions never reuse the production customer signer or the admin signer.
process.env.CUSTOMER_SESSION_SECRET = randomBytes(32).toString('hex');
if (/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? '')) throw new Error('Refusing live payment credentials in local preview');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3031'], { stdio: 'inherit', env: process.env, windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
