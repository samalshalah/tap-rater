import {NextResponse} from 'next/server';
import {googleAdminIdentity} from './google-business/http';

// Staff authentication grants operational support access, never customer content access.
export async function denyAdminClientContent() {
  const signedIn = Boolean(await googleAdminIdentity());
  return NextResponse.json({error: signedIn
    ? 'Client content is private. Staff can view account operations only.'
    : 'Sign in to continue.'}, {
    status: signedIn ? 403 : 401,
    headers: {'Cache-Control':'private, no-store'},
  });
}
