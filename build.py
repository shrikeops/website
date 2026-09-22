#!/usr/bin/env python3
"""Build shrikeops.ca: Markdown content plus one layout into static pages.

Pages live in content/<name>.md and become /<name>/. The home page is
content/index.md. Articles live in content/articles/<slug>.md with a
`date:` field; the articles index generates from the set, and the
Articles nav item appears when the first article exists.

Every document opens with a front-matter block of `key: value` lines
between --- fences, then a Markdown body. Raw HTML passes through
Markdown, so art-directed markup (inline SVG) can sit in a page.
style.css is inlined into every page; static/ is copied verbatim.
"""

import shutil
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
ARTICLES = CONTENT / "articles"
STATIC = ROOT / "static"
DIST = ROOT / "dist"
EXTENSIONS = ["tables", "fenced_code", "attr_list"]


class Document:
    def __init__(self, path, slug):
        self.slug = slug
        self.meta, body = parse(path)
        self.title = self.meta.get("title", "")
        self.html = markdown.markdown(body, extensions=EXTENSIONS)
        self.nav = self.meta.get("nav")
        self.order = int(self.meta.get("order", "99"))
        self.date = self.meta.get("date", "")


def parse(path):
    text = path.read_text(encoding="utf-8")
    meta = {}
    if text.startswith("---\n"):
        fence = text.index("\n---\n", 4)
        for line in text[4:fence].splitlines():
            key, sep, value = line.partition(":")
            if not sep:
                sys.exit(f"{path}: bad front-matter line {line!r}")
            meta[key.strip()] = value.strip()
        text = text[fence + 4 :]
    return meta, text.lstrip("\n")


def nav_html(entries, current_slug):
    items = []
    for label, url, slug in entries:
        current = slug == current_slug or (
            slug == "articles" and current_slug.startswith("articles/")
        )
        attr = ' class="current" aria-current="page"' if current else ""
        items.append(f"<li><a{attr} href=\"{url}\">{label}</a></li>")
    return "          <ul>\n            " + "\n            ".join(items) + "\n          </ul>"


def render_page(layout, css, nav, doc, title_suffix=True):
    title = f"{doc.title} - Shrike Ops" if title_suffix else doc.title
    return (
        layout.replace("{{ title }}", title)
        .replace("{{ description }}", doc.meta.get("description", ""))
        .replace("{{ css }}", css)
        .replace("{{ nav }}", nav)
        .replace("{{ content }}", doc.html)
    )


def out_path(slug):
    if slug == "":
        return DIST / "index.html"
    return DIST / slug / "index.html"


def write(path, html):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    layout = (ROOT / "layout.html").read_text(encoding="utf-8")
    css = (ROOT / "style.css").read_text(encoding="utf-8")

    pages = [Document(p, p.stem if p.stem != "index" else "") for p in sorted(CONTENT.glob("*.md"))]
    articles = (
        sorted(
            (Document(p, f"articles/{p.stem}") for p in ARTICLES.glob("*.md")),
            key=lambda doc: doc.date,
            reverse=True,
        )
        if ARTICLES.exists()
        else []
    )

    entries = [
        (doc.nav, f"/{doc.slug}/" if doc.slug else "/", doc.slug)
        for doc in sorted(pages, key=lambda d: d.order)
        if doc.nav
    ]
    if articles:
        entries.append(("Articles", "/articles/", "articles"))

    for doc in pages + articles:
        nav = nav_html(entries, doc.slug)
        write(out_path(doc.slug), render_page(layout, css, nav, doc, title_suffix=bool(doc.slug)))

    if articles:
        items = "\n".join(
            f'            <li><time datetime="{a.date}">{a.date}</time>'
            f' <a href="/articles/{a.slug.removeprefix("articles/")}/">{a.title}</a></li>'
            for a in articles
        )
        index = Document.__new__(Document)
        index.slug, index.title, index.meta = "articles", "Articles", {}
        index.html = f'<h1>Articles</h1>\n<ul class="article-list">\n{items}\n</ul>'
        nav = nav_html(entries, "articles")
        write(out_path("articles"), render_page(layout, css, nav, index))

    if STATIC.exists():
        for src in STATIC.rglob("*"):
            if src.is_file():
                dest = DIST / src.relative_to(STATIC)
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)

    count = len(pages) + len(articles) + (1 if articles else 0)
    print(f"built {count} page(s) into {DIST.relative_to(ROOT)}/")


if __name__ == "__main__":
    build()
