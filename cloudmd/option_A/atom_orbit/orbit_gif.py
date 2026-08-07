#!/usr/bin/env python3
"""Export the electron orbit animation to electron_orbit.gif.

Reuses the scene from orbit_viewer.py so the two renders can never drift apart
(the original codebase had three copies of this geometry that had already
diverged). Only the output stage differs: PillowWriter at fps=30 instead of an
interactive window.

Output is written next to this script, not to an absolute path.

Requires: numpy, matplotlib, pillow
"""

import sys
from pathlib import Path

import matplotlib

# Must be set before pyplot is imported anywhere, including by orbit_viewer.
matplotlib.use('Agg')

import matplotlib.animation as animation  # noqa: E402
import matplotlib.pyplot as plt           # noqa: E402

import orbit_viewer as scene              # noqa: E402  (builds fig/ani on import)

FPS = 30
OUTPUT = Path(__file__).resolve().with_name('electron_orbit.gif')


def main():
    if 'pillow' not in animation.writers.list():
        print('ERROR: PillowWriter unavailable. Install Pillow:', file=sys.stderr)
        print('  pip install pillow', file=sys.stderr)
        return 1

    print(f'Rendering {scene.FRAMES} frames '
          f'({scene.ORBIT_RINGS} rings x {scene.ELECTRONS_PER_RING} e- '
          f'= {scene.N_ELECTRONS} electrons) ...')

    scene.ani.save(str(OUTPUT), writer=animation.PillowWriter(fps=FPS))
    plt.close(scene.fig)

    size_kb = OUTPUT.stat().st_size / 1024
    print(f'Saved {OUTPUT}  ({size_kb:.1f} KB, {FPS} fps, '
          f'{scene.FRAMES / FPS:.2f} s loop)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
