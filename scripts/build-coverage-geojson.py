#!/usr/bin/env python3
"""Build the small website coverage map from the official ISTAT boundary ZIP.

Uses only Python's standard library. Input: ISTAT 2026 generalized WGS84 UTM32N
ZIP (https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici-al-1-gennaio-2018-2/).
Coverage IDs and display labels come from assets/data/service-areas.json.
"""

import argparse
import json
import math
import struct
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AREAS_PATH = ROOT / "assets" / "data" / "service-areas.json"
OUTPUT_PATH = ROOT / "assets" / "data" / "it-provinces.geojson"


def dbf_rows(data):
    record_count = struct.unpack_from("<I", data, 4)[0]
    header_length = struct.unpack_from("<H", data, 8)[0]
    record_length = struct.unpack_from("<H", data, 10)[0]
    fields = []
    offset = 1
    for position in range(32, header_length - 1, 32):
        descriptor = data[position : position + 32]
        name = descriptor[:11].split(b"\0", 1)[0].decode("ascii")
        length = descriptor[16]
        fields.append((name, offset, length))
        offset += length

    rows = []
    for index in range(record_count):
        start = header_length + index * record_length
        record = data[start : start + record_length]
        values = {
            name: record[field_offset : field_offset + length].decode("utf-8").strip()
            for name, field_offset, length in fields
        }
        rows.append(values)
    return rows


def shape_records(data):
    position = 100
    while position + 8 <= len(data):
        _, word_length = struct.unpack_from(">II", data, position)
        position += 8
        content_length = word_length * 2
        content = data[position : position + content_length]
        position += content_length
        shape_type = struct.unpack_from("<I", content, 0)[0]
        if shape_type == 0:
            yield []
            continue
        if shape_type != 5:
            raise ValueError(f"Expected Polygon shape type 5, received {shape_type}")

        part_count, point_count = struct.unpack_from("<II", content, 36)
        part_offsets = struct.unpack_from(f"<{part_count}I", content, 44)
        points_start = 44 + 4 * part_count
        points = [struct.unpack_from("<dd", content, points_start + index * 16) for index in range(point_count)]
        ends = list(part_offsets[1:]) + [point_count]
        yield [points[start:end] for start, end in zip(part_offsets, ends)]


def utm32_to_wgs84(easting, northing):
    # Inverse Transverse Mercator for WGS84 / UTM zone 32N (EPSG:32632).
    a = 6378137.0
    e2 = 0.0066943799901413165
    ep2 = e2 / (1 - e2)
    k0 = 0.9996
    x = easting - 500000.0
    m = northing / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
        + (1097 * e1**4 / 512) * math.sin(8 * mu)
    )
    sin_phi = math.sin(phi1)
    cos_phi = math.cos(phi1)
    tan_phi = math.tan(phi1)
    n1 = a / math.sqrt(1 - e2 * sin_phi**2)
    r1 = a * (1 - e2) / (1 - e2 * sin_phi**2) ** 1.5
    t1 = tan_phi**2
    c1 = ep2 * cos_phi**2
    d = x / (n1 * k0)
    latitude = phi1 - (n1 * tan_phi / r1) * (
        d**2 / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * ep2) * d**4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1**2 - 252 * ep2 - 3 * c1**2) * d**6 / 720
    )
    longitude = math.radians(9) + (
        d
        - (1 + 2 * t1 + c1) * d**3 / 6
        + (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * ep2 + 24 * t1**2) * d**5 / 120
    ) / cos_phi
    return [round(math.degrees(longitude), 6), round(math.degrees(latitude), 6)]


def ring_area(ring):
    return sum(
        left[0] * right[1] - right[0] * left[1]
        for left, right in zip(ring, ring[1:] + ring[:1])
    ) / 2


def point_in_ring(point, ring):
    x, y = point
    inside = False
    previous = ring[-1]
    for current in ring:
        if (current[1] > y) != (previous[1] > y):
            crossing_x = (previous[0] - current[0]) * (y - current[1]) / (previous[1] - current[1]) + current[0]
            if x < crossing_x:
                inside = not inside
        previous = current
    return inside


def polygon_coordinates(rings):
    # ESRI shapefiles encode clockwise shells and counterclockwise holes.
    shells = [ring for ring in rings if ring_area(ring) < 0]
    holes = [ring for ring in rings if ring_area(ring) >= 0]
    if not shells and rings:
        shells, holes = [rings[0]], rings[1:]
    polygons = [[shell] for shell in shells]
    for hole in holes:
        parent = next((index for index, shell in enumerate(shells) if point_in_ring(hole[0], shell)), None)
        if parent is None:
            polygons.append([hole])
        else:
            polygons[parent].append(hole)
    return [[ [utm32_to_wgs84(x, y) for x, y in ring] for ring in polygon] for polygon in polygons]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("istat_zip", type=Path, help="Path to ISTAT's generalized 2026 boundaries ZIP")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="Output GeoJSON path (defaults to the website asset)")
    args = parser.parse_args()

    config = json.loads(AREAS_PATH.read_text(encoding="utf-8"))
    wanted = {area["geometryId"]: area for area in config["areas"]}
    found = {}

    with zipfile.ZipFile(args.istat_zip) as archive:
        for level, folder_prefix, shape_prefix, dbf_code_field in (
            ("province", "ProvCM01012026_g/", "ProvCM01012026_g_WGS84", "COD_UTS"),
            ("region", "Reg01012026_g/", "Reg01012026_g_WGS84", "COD_REG"),
        ):
            paths = [name for name in archive.namelist() if name.replace("\\", "/").startswith(folder_prefix)]
            shp_path = next(name for name in paths if name.endswith(shape_prefix + ".shp"))
            dbf_path = next(name for name in paths if name.endswith(shape_prefix + ".dbf"))
            records = dbf_rows(archive.read(dbf_path))
            shapes = list(shape_records(archive.read(shp_path)))
            if len(records) != len(shapes):
                raise ValueError(f"Shape/DBF count mismatch for {level}: {len(shapes)} vs {len(records)}")

            for row, rings in zip(records, shapes):
                geometry_id = f"{'uts' if level == 'province' else 'reg'}:{int(float(row[dbf_code_field]))}"
                area = wanted.get(geometry_id)
                if area is None or not rings:
                    continue
                found[geometry_id] = {
                    "type": "Feature",
                    "properties": {
                        "province": area["id"],
                        "geometryId": geometry_id,
                        "adminLevel": level,
                        "name": area["labels"]["it"],
                    },
                    "geometry": {"type": "MultiPolygon", "coordinates": polygon_coordinates(rings)},
                }

    missing = sorted(set(wanted) - set(found))
    if missing:
        raise ValueError("No matching ISTAT boundary for: " + ", ".join(missing))

    output = {
        "type": "FeatureCollection",
        "name": "Frascarelli service areas — ISTAT 2026 generalized boundaries",
        "source": "ISTAT, Confini delle unità amministrative a fini statistici, 1 January 2026",
        "features": [found[area["geometryId"]] for area in config["areas"]],
    }
    args.output.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(output['features'])} area geometries to {args.output}")


if __name__ == "__main__":
    main()
