import http from 'http';

function req(path, host, headers = {}, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      host: 'localhost', port: 8080, path, method,
      headers: { ...headers, Host: host, ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) },
    };
    const rq = http.request(opts, (res) => {
      let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ code: res.statusCode, body: b }));
    });
    if (data) rq.write(data);
    rq.end();
  });
}

const login = await req('/api/v1/auth/login/', 'acme.localhost', {}, 'POST', { email: 'demo@saptta.com', password: 'Demo@1234' });
const tok = JSON.parse(login.body).access;
const claim = JSON.parse(Buffer.from(tok.split('.')[1], 'base64').toString()).workspace;
console.log('token workspace claim:', claim);
console.log('GET /auth/me on acme (own):', (await req('/api/v1/auth/me/', 'acme.localhost', { Authorization: 'Bearer ' + tok })).code);
console.log('GET /masters/parties on acme (own):', (await req('/api/v1/masters/parties/', 'acme.localhost', { Authorization: 'Bearer ' + tok })).code);
