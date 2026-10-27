import app from './app.js';
import {authSession, authRoute, authRedirect, authSameOrigin} from './auth.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Retired deployments must not remain usable through their preview aliases.
    // localhost is reserved for isolated browser QA, never a hosted Pages alias.
    if (!['tinydreams.pages.dev', 'localhost'].includes(url.hostname)) return new Response('Not found', {status:404});
    const path = url.pathname;
    // Installation metadata must work even when iOS fetches it without a session.
    const publicAssets = ['/fraunces.ttf','/dm-sans.ttf','/icon.svg','/apple-touch-icon.png','/icon-192.png','/icon-512.png','/manifest.webmanifest','/version.json','/updates.js'];
    if (publicAssets.includes(path) && ['GET','HEAD'].includes(request.method)) {
      const asset=await env.ASSETS.fetch(request);
      const result=new Response(asset.body,asset);
      result.headers.set('Cache-Control','no-store');
      result.headers.set('X-Content-Type-Options','nosniff');
      return result;
    }
    const session = await authSession(request, env);
    const login = await authRoute(request, env, session);
    if (login) return login;
    if (!session) {
      if (path.startsWith('/api/')) return Response.json({error:'Sua sessão terminou. Entre novamente.'}, {status:401, headers:{'Cache-Control':'no-store'}});
      return authRedirect('/login');
    }
    if (!['GET','HEAD'].includes(request.method) && !authSameOrigin(request)) return new Response('Origem não permitida.', {status:403});
    const headers = new Headers(request.headers);
    // Only the verified owner maps to the existing local records. Ignore client identity headers.
    headers.set('oai-authenticated-user-id', 'local-preview');
    const authenticated = new Request(request, {headers});
    const response = new URL(request.url).pathname.startsWith('/api/')
      ? await app.fetch(authenticated, env)
      : await env.ASSETS.fetch(request);
    const result = new Response(response.body, response);
    result.headers.set('Cache-Control', 'private, no-store');
    result.headers.set('X-Content-Type-Options', 'nosniff');
    result.headers.set('Referrer-Policy', 'same-origin');
    result.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'");
    return result;
  }
};
