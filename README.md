# shrikeops.ca

The Shrike Ops website. Static site: Markdown content built by `build.py` into `dist/`. No JavaScript, no external assets; `style.css` is inlined into every page.

## Develop locally

```sh
uv sync
uv run python serve.py
```

Serves on `0.0.0.0:8000` and rebuilds automatically when a source file changes. `uv run python build.py` builds once into `dist/`.

`.envrc` sets `UV_CACHE_DIR` to the in-repo `.uv-cache/`; run `direnv allow` once if you use direnv, otherwise export it yourself.

## Conventions

- Pages: `content/<name>.md` becomes `/<name>/`. The home page is `content/index.md`.
- Articles: `content/articles/<slug>.md` with a `date:` field. The index page generates from the set, and the Articles nav item appears when the first article exists.
- Front matter: `---` fenced `key: value` lines. Keys: `title`, `description`, `nav` (nav label; omit to exclude from nav), `order` (nav position), `date` (articles).
- Copy placeholders: a `[copy: ...]` paragraph followed by a `{: .placeholder}` attribute line; they render with an amber left border until replaced.
- Raw HTML passes through Markdown (inline SVG). Keep HTML blocks flush left with blank lines around them.
- `static/` is copied into `dist/` verbatim (CNAME).
- Theme experiments: `themes/<name>.css` is an override sheet cascaded after `style.css`; preview with `?theme=<name>` (nav links keep the theme). Dev-only; a chosen theme merges into `style.css` and `themes/` goes away.
