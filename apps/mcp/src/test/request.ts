const LOCAL_HOST = '127.0.0.1';
const LOCAL_ORIGIN = `http://${LOCAL_HOST}:8787`;

export function localAppRequest(path: string, init?: RequestInit): Request {
  const url = `${LOCAL_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  if (!headers.has('Host')) {
    headers.set('Host', LOCAL_HOST);
  }
  return new Request(url, { ...init, headers });
}

function withLocalHost(request: Request): Request {
  const headers = new Headers(request.headers);
  if (!headers.has('Host')) {
    headers.set('Host', LOCAL_HOST);
  }
  return new Request(request, { headers });
}

export function localMcpFetch(appFetch: (req: Request) => Response | Promise<Response>) {
  return (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (input instanceof Request) {
      return appFetch(withLocalHost(input));
    }
    if (input instanceof URL) {
      const headers = new Headers(init?.headers);
      if (!headers.has('Host')) {
        headers.set('Host', LOCAL_HOST);
      }
      return appFetch(new Request(input, { ...init, headers }));
    }
    const url = input.toString();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const headers = new Headers(init?.headers);
      if (!headers.has('Host')) {
        headers.set('Host', LOCAL_HOST);
      }
      return appFetch(new Request(url, { ...init, headers }));
    }
    return appFetch(localAppRequest(url, init));
  };
}
