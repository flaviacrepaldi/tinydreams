const SESSION_COOKIE = '__Host-tinydreams';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const ATTEMPT_WINDOW = 15 * 60;
const authEncoder = new TextEncoder();
const schemas = new WeakMap();
const authEncode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const authDecode = text => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
async function authHash(text) {
  return authEncode(await crypto.subtle.digest('SHA-256', authEncoder.encode(text)));
}
async function authKey(password) {
  return crypto.subtle.importKey('raw', authEncoder.encode(password), {name:'HMAC', hash:'SHA-256'}, false, ['sign', 'verify']);
}
function authConfigured(env) {
  return typeof env.OWNER_PASSWORD === 'string' && env.OWNER_PASSWORD.length >= 16 && env.OWNER_PASSWORD.length <= 256 && !!env.DB;
}
async function authSchema(db) {
  if (!schemas.has(db)) {
    const ready = db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS td_auth_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS td_auth_attempts (client_hash TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL)')
    ]).catch(error => { schemas.delete(db); throw error; });
    schemas.set(db, ready);
  }
  await schemas.get(db);
}
function authCookie(request) {
  const cookies = (request.headers.get('Cookie') || '').split(';').map(value => value.trim());
  const value = cookies.find(value => value.startsWith(SESSION_COOKIE + '='))?.slice(SESSION_COOKIE.length + 1);
  return value && value.length < 200 ? value : null;
}
async function authSession(request, env) {
  if (!authConfigured(env)) return null;
  try {
    const value = authCookie(request);
    if (!value) return null;
    const [token, signature, extra] = value.split('.');
    if (extra !== undefined || !/^[A-Za-z0-9_-]{43}$/.test(token || '') || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')) return null;
    const valid = await crypto.subtle.verify('HMAC', await authKey(env.OWNER_PASSWORD), authDecode(signature), authEncoder.encode('session:' + new URL(request.url).origin + ':' + token));
    if (!valid) return null;
    await authSchema(env.DB);
    const hash = await authHash(token);
    const rows = await env.DB.prepare('SELECT token_hash FROM td_auth_sessions WHERE token_hash = ? AND expires_at > ?').bind(hash, Math.floor(Date.now()/1000)).all();
    return rows.results.length ? hash : null;
  } catch { return null; }
}
function authResponse(body, status = 200, headers = {}) {
  return new Response(body, {status, headers:{'Cache-Control':'private, no-store','Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",...headers}});
}
function authRedirect(path, cookie) {
  return authResponse(null, 303, {Location:path,...(cookie ? {'Set-Cookie':cookie} : {})});
}
function authSameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin && request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}
async function authRoute(request, env, session) {
  const {pathname, origin} = new URL(request.url);
  if (pathname === '/login' && ['GET','HEAD'].includes(request.method)) {
    if (session) return authRedirect('/');
    const message = authConfigured(env) ? '' : 'A entrada ainda está sendo preparada. Tente novamente depois da configuração.';
    return authResponse(request.method === 'HEAD' ? null : loginPage(message), authConfigured(env) ? 200 : 503);
  }
  if (!['/auth/login','/auth/logout'].includes(pathname)) return null;
  if (request.method !== 'POST') return authResponse('Ação não permitida.', 405, {Allow:'POST'});
  if (!authSameOrigin(request)) return authResponse('Origem não permitida.', 403);
  if (!authConfigured(env)) return authResponse(loginPage('A entrada ainda está sendo preparada. Tente novamente depois da configuração.'), 503);
  try {
    await authSchema(env.DB);
    if (pathname === '/auth/logout') {
      if (session) await env.DB.prepare('DELETE FROM td_auth_sessions WHERE token_hash = ?').bind(session).run();
      return authRedirect('/login', SESSION_COOKIE + '=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0');
    }
    if (!(request.headers.get('Content-Type') || '').startsWith('application/x-www-form-urlencoded')) return authResponse('Formato não permitido.', 415);
    // Consume the rate-limit slot atomically before checking a password, across isolates.
    const now = Math.floor(Date.now()/1000);
    const client = await authHash(request.headers.get('CF-Connecting-IP') || 'unknown');
    const windowStart = now - now % ATTEMPT_WINDOW;
    const results = await env.DB.batch([
      env.DB.prepare('DELETE FROM td_auth_sessions WHERE expires_at <= ?').bind(now),
      env.DB.prepare('DELETE FROM td_auth_attempts WHERE window_start < ?').bind(windowStart),
      env.DB.prepare('INSERT INTO td_auth_attempts (client_hash, window_start, attempts) VALUES (?, ?, 1) ON CONFLICT(client_hash) DO UPDATE SET attempts = CASE WHEN window_start = excluded.window_start THEN attempts + 1 ELSE 1 END, window_start = excluded.window_start RETURNING attempts').bind(client, windowStart)
    ]);
    if (results[2].results[0].attempts > 5) return authResponse(loginPage('Muitas tentativas. Aguarde alguns minutos e tente novamente.'), 429, {'Retry-After':String(windowStart + ATTEMPT_WINDOW - now)});
    // Bound the body before parsing; do not accept passwords in URLs or JSON logs.
    const reader = request.body?.getReader();
    if (!reader) return authResponse(loginPage('Digite sua senha para entrar.'), 400);
    const chunks = []; let length = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) { await reader.cancel(); return authResponse('Formulário grande demais.', 413); }
      chunks.push(value);
    }
    const body = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const password = new URLSearchParams(new TextDecoder().decode(body)).get('password') || '';
    // Web Crypto verifies fixed-length MACs without comparing secret strings in JS.
    const proof = await crypto.subtle.sign('HMAC', await authKey(password || 'empty'), authEncoder.encode('tiny-dreams-owner-login'));
    const valid = await crypto.subtle.verify('HMAC', await authKey(env.OWNER_PASSWORD), proof, authEncoder.encode('tiny-dreams-owner-login'));
    if (!valid || password.length > 256) return authResponse(loginPage('Senha incorreta. Confira e tente novamente.'), 401);
    const token = authEncode(crypto.getRandomValues(new Uint8Array(32)));
    const signature = authEncode(await crypto.subtle.sign('HMAC', await authKey(env.OWNER_PASSWORD), authEncoder.encode('session:' + origin + ':' + token)));
    const statements = [env.DB.prepare('INSERT INTO td_auth_sessions (token_hash, expires_at) VALUES (?, ?)').bind(await authHash(token), now + SESSION_SECONDS)];
    if (session) statements.push(env.DB.prepare('DELETE FROM td_auth_sessions WHERE token_hash = ?').bind(session));
    await env.DB.batch(statements);
    return authRedirect('/', SESSION_COOKIE + '=' + token + '.' + signature + '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=' + SESSION_SECONDS);
  } catch {
    return authResponse(loginPage('Não foi possível entrar agora. Tente novamente em instantes.'), 503);
  }
}
