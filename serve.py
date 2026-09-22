#!/usr/bin/env python3
"""Serve the site locally for development.

Builds once, then serves dist/ on 0.0.0.0:8000. Before each request,
rebuilds if any content, layout, or stylesheet source changed, so the
edit-refresh loop needs no manual build step.

Theme experiments: files in themes/<name>.css are override sheets
cascaded after the base style.css. Preview with ?theme=<name>; nav
links are rewritten to keep the theme while moving between pages.
Theme previewing is dev-only; the shipped build inlines style.css.
"""

import http.server
import re
import time
import urllib.parse
from pathlib import Path

import build

ROOT = Path(__file__).resolve().parent
SOURCE_DIRS = ("content", "static", "themes")
SOURCE_FILES = ("layout.html", "style.css")

last_built = 0.0


def source_mtime():
    candidates = [ROOT / name for name in SOURCE_FILES]
    for name in SOURCE_DIRS:
        directory = ROOT / name
        if directory.exists():
            candidates.extend(p for p in directory.rglob("*") if p.is_file())
    return max(p.stat().st_mtime for p in candidates)


def rebuild_if_stale():
    global last_built
    if source_mtime() > last_built:
        build.build()
        last_built = time.time()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(build.DIST), **kwargs)

    def do_GET(self):
        rebuild_if_stale()
        parsed = urllib.parse.urlparse(self.path)
        theme = urllib.parse.parse_qs(parsed.query).get("theme", [None])[0]
        if theme is None:
            return super().do_GET()
        self.serve_themed(parsed.path, theme)

    def serve_themed(self, path, theme):
        if not re.fullmatch(r"[a-z0-9-]+", theme):
            return self.send_error(404, "unknown theme")
        theme_file = ROOT / "themes" / f"{theme}.css"
        if not theme_file.is_file():
            return self.send_error(404, f"no themes/{theme}.css")

        rel = path.lstrip("/")
        target = build.DIST / rel
        if rel == "" or path.endswith("/") or target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            return self.send_error(404)

        html = target.read_text(encoding="utf-8")
        theme_css = theme_file.read_text(encoding="utf-8")
        html = html.replace("</head>", f"<style>\n{theme_css}\n</style>\n  </head>")
        html = re.sub(r'href="(/[^"]*)"', rf'href="\1?theme={theme}"', html)

        data = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    rebuild_if_stale()
    server = http.server.ThreadingHTTPServer(("0.0.0.0", 8000), Handler)
    print("serving on http://0.0.0.0:8000")
    server.serve_forever()
