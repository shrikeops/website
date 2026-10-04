"""Build site/assets/js/data/world.js from Natural Earth 1:110m data.

Downloads land and country outlines (world-atlas package, TopoJSON) and lakes
(Natural Earth GeoJSON), keeps rings that cross the antimeridian whole, cuts
the world at 30°W so the About page's map can centre on the Pacific without
splitting land, drops Antarctica, simplifies, and writes a small JS module of
[lon, lat, lon, lat, ...] rings. The 1:10m land and lakes are clipped to the
Lake Ontario region for the Belleville close-up, where 1:110m is too coarse.

Run:  uv run --with shapely python tools/build_world_data.py
"""

import json
import urllib.request
from pathlib import Path

from shapely import affinity
from shapely.geometry import Polygon, box, shape
from shapely.ops import unary_union

CUT = -30.0
SIMPLIFY_DEG = 0.18
OUT = Path(__file__).resolve().parent.parent / 'site' / 'assets' / 'js' / 'data' / 'world.js'
SOURCES = {
    'land': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json',
    'countries': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json',
    'lakes': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_lakes.geojson',
    'region_land': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson',
    'region_lakes': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson',
}
REGION = (-82.0, 42.0, -74.0, 46.5)
COUNTRIES = {'036': 'australia', '124': 'canada', '372': 'ireland', '826': 'unitedKingdom'}


def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.load(response)


def unwrap(points):
    """Keep a ring's longitudes continuous, so a ring that crosses the
    antimeridian runs on past 180° instead of jumping back across the whole
    world. A ring around the South Pole cannot close that way and keeps its
    outline; the map leaves Antarctica out."""
    out = [points[0]]
    for lon, lat in points[1:]:
        out.append((lon + 360 * round((out[-1][0] - lon) / 360), lat))
    return out if out[-1][0] == out[0][0] else points


def topo_decoder(topo):
    sx, sy = topo['transform']['scale']
    tx, ty = topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((x * sx + tx, y * sy + ty))
        arcs.append(points)

    def ring(ids):
        points = []
        for i in ids:
            arc = arcs[i] if i >= 0 else arcs[~i][::-1]
            points.extend(arc if not points else arc[1:])
        return unwrap(points)

    def polygons(geometry):
        if geometry['type'] == 'Polygon':
            return [Polygon(ring(geometry['arcs'][0]), [ring(h) for h in geometry['arcs'][1:]])]
        if geometry['type'] == 'MultiPolygon':
            return [Polygon(ring(p[0]), [ring(h) for h in p[1:]]) for p in geometry['arcs']]
        return []

    return polygons


def rings(polygons, min_area=0.3):
    merged = unary_union([p.buffer(0) for p in polygons])
    frame = box(CUT, -90, CUT + 360, 90)
    out = []
    for shift in (0, 360):
        part = affinity.translate(merged, xoff=shift).intersection(frame)
        for p in getattr(part, 'geoms', [part]):
            if p.is_empty or p.geom_type != 'Polygon' or p.centroid.y < -60:
                continue
            p = p.simplify(SIMPLIFY_DEG, preserve_topology=True)
            if p.area < min_area:
                continue
            out.append([round(v, 1) for xy in list(p.exterior.coords)[:-1] for v in xy])
    return out


def region_rings(features):
    area = box(*REGION)
    out = []
    for f in features:
        geometry = shape(f['geometry'])
        if not geometry.intersects(area):
            continue
        clipped = geometry.buffer(0).intersection(area).simplify(0.004, preserve_topology=True)
        for p in getattr(clipped, 'geoms', [clipped]):
            if p.is_empty or p.geom_type != 'Polygon' or p.area < 0.0004:
                continue
            out.append([round(v + 360 if i % 2 == 0 else v, 3) for xy in list(p.exterior.coords)[:-1] for i, v in enumerate(xy)])
    return out


def main():
    land, countries, lakes = (fetch(SOURCES[k]) for k in ('land', 'countries', 'lakes'))
    decode = topo_decoder(land)
    land_rings = rings([p for g in land['objects']['land']['geometries'] for p in decode(g)])
    decode = topo_decoder(countries)
    picked = {name: [] for name in COUNTRIES.values()}
    for g in countries['objects']['countries']['geometries']:
        if g.get('id') in COUNTRIES:
            picked[COUNTRIES[g['id']]] = rings(decode(g))
    lake_polygons = [p for f in lakes['features'] for p in getattr(shape(f['geometry']), 'geoms', [shape(f['geometry'])])]
    lake_rings = rings(lake_polygons, min_area=0.05)
    region_land = region_rings(fetch(SOURCES['region_land'])['features'])
    region_lakes = region_rings(fetch(SOURCES['region_lakes'])['features'])
    header = [
        '// Generated by tools/build_world_data.py. Do not edit by hand.',
        '// Natural Earth 1:110m land, countries and lakes (public domain). Land and',
        '// countries via the world-atlas package, Copyright 2013-2019 Michael Bostock,',
        '// ISC licence: permission to use, copy, modify, and/or distribute for any',
        '// purpose with or without fee is granted, provided the copyright notice and',
        '// this permission notice appear in all copies. Rings are [lon, lat, ...];',
        '// longitudes run from -30 to 330 so the map can centre on the Pacific.',
        '// REGION_* rings are Natural Earth 1:10m clipped to the Lake Ontario region.',
    ]
    compact = lambda v: json.dumps(v, separators=(',', ':'))
    OUT.write_text('\n'.join(header + [
        f'export const LAND = {compact(land_rings)};',
        f'export const LAKES = {compact(lake_rings)};',
        f'export const COUNTRIES = {compact(picked)};',
        f'export const REGION_LAND = {compact(region_land)};',
        f'export const REGION_LAKES = {compact(region_lakes)};',
    ]) + '\n')
    print(f'wrote {OUT.name}: {len(land_rings)} land rings, {len(lake_rings)} lakes, countries {sorted(picked)}, '
          f'region {len(region_land)} land / {len(region_lakes)} lake rings')


if __name__ == '__main__':
    main()
