#!/usr/bin/env python3
"""
Generates data/guidelines.min.js from data/guidelines.js.
Run from the ConsultReady root directory after any edit to guidelines.js:
    python3 scripts/minify.py
"""
import os

src = os.path.join(os.path.dirname(__file__), '..', 'data', 'guidelines.js')
dst = os.path.join(os.path.dirname(__file__), '..', 'data', 'guidelines.min.js')

with open(src, 'r') as f:
    lines = f.readlines()

minified = [l.lstrip() for l in lines if l.strip()]

with open(dst, 'w') as f:
    f.writelines(minified)

src_kb = os.path.getsize(src) / 1024
dst_kb = os.path.getsize(dst) / 1024
print(f'{src_kb:.0f} KB -> {dst_kb:.0f} KB ({100 * (1 - dst_kb/src_kb):.0f}% reduction)')
