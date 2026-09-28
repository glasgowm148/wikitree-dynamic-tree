#!/usr/bin/env python3
"""Local public-profile testing, using the real WikiTree API without browser CORS restrictions."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
API = "https://api.wikitree.com/api.php"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path in ("/", "/index.html"):
            page = (ROOT / "index.html").read_text()
            page = page.replace('<script src="WikiTreeAPI.js"></script>',
                                '<script>var API_URL = "/bcfc-api";</script>\n  <script src="WikiTreeAPI.js"></script>')
            data = page.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != "/bcfc-api":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 65536:
                self.send_error(400, "Invalid request size")
                return
            body = self.rfile.read(size)
            params = parse_qs(body.decode())
            if params.get("action", [""])[0] not in ("getPerson", "getPeople") or "token" in params:
                self.send_error(400, "Local proxy supports public getPerson/getPeople only; use Apps Server for login")
                return
            # Deliberately forward no browser cookies or login tokens.
            request = Request(API, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
            with urlopen(request, timeout=45) as response:
                data = response.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
        except (HTTPError, URLError, TimeoutError, ValueError) as error:
            self.send_error(502, str(error))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    print(f"Tree Apps: http://127.0.0.1:{args.port}/#name=Stuart-1&view=fanChartBirthCountry", flush=True)
    print("Public profiles only locally. Test Apps Login/private access on apps.wikitree.com.", flush=True)
    try:
        ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
    except KeyboardInterrupt:
        pass
