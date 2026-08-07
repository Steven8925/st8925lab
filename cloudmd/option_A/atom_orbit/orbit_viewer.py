#!/usr/bin/env python3
"""Electron orbit around an atomic nucleus - interactive matplotlib viewer.

Isolated program with fixed parameters:
    6 orbit rings, 2 electrons per ring (12 electrons total),
    radius 1.3 data units, tilt 65 deg, ring alpha 0.4,
    nucleus marker s=250, 80 frames at interval=30 ms,
    trail of 15 points spanning 0.5 rad.

Requires: numpy, matplotlib
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# ---------------------------------------------------------------
# FIXED PARAMETERS
# ---------------------------------------------------------------
ORBIT_RINGS        = 6      # orbit planes
ELECTRONS_PER_RING = 2      # -> 12 electrons total
RADIUS             = 1.3    # data units
TILT_DEG           = 65     # deg
RING_ALPHA         = 0.4
RING_SEGMENTS      = 200
NUCLEUS_SIZE       = 250    # matplotlib scatter `s`
FRAMES             = 80
INTERVAL_MS        = 30
TRAIL_POINTS       = 15
TRAIL_SPAN         = 0.5    # rad covered by the trail
AXIS_LIMIT         = 1.8

BG        = '#0f172a'
C_ORBIT   = '#38bdf8'
C_NUCLEUS = '#ef4444'
C_NUC_EDGE = '#fca5a5'
# ---------------------------------------------------------------

TILT = np.radians(TILT_DEG)
COS_TILT, SIN_TILT = np.cos(TILT), np.sin(TILT)


def ring_point(theta, plane_angle):
    """Circle in XY, tilted about X by TILT, then spun about Z by plane_angle.

    theta may be a scalar or an array; returns (x, y, z) of matching shape.
    """
    x0 = RADIUS * np.cos(theta)
    y0 = RADIUS * np.sin(theta)
    cos_p, sin_p = np.cos(plane_angle), np.sin(plane_angle)
    x = x0 * cos_p - (y0 * COS_TILT) * sin_p
    y = x0 * sin_p + (y0 * COS_TILT) * cos_p
    z = y0 * SIN_TILT
    return x, y, z


fig = plt.figure(figsize=(7, 7), dpi=100, facecolor=BG)
ax = fig.add_subplot(111, projection='3d', facecolor=BG)
ax.set_axis_off()
ax.set_xlim(-AXIS_LIMIT, AXIS_LIMIT)
ax.set_ylim(-AXIS_LIMIT, AXIS_LIMIT)
ax.set_zlim(-AXIS_LIMIT, AXIS_LIMIT)

# nucleus
ax.scatter([0], [0], [0], color=C_NUCLEUS, s=NUCLEUS_SIZE,
           edgecolors=C_NUC_EDGE, linewidth=2, zorder=10)

# static orbit rings, fanned evenly over half a turn
plane_angles = np.linspace(0, np.pi, ORBIT_RINGS, endpoint=False)
theta = np.linspace(0, 2 * np.pi, RING_SEGMENTS)
for plane_angle in plane_angles:
    rx, ry, rz = ring_point(theta, plane_angle)
    ax.plot(rx, ry, rz, color=C_ORBIT, linestyle='-',
            alpha=RING_ALPHA, linewidth=1.5)

# one electron marker + one trail line per electron
N_ELECTRONS = ORBIT_RINGS * ELECTRONS_PER_RING
electrons = [ax.plot([], [], [], 'o', color=C_ORBIT, markersize=9,
                     markeredgecolor='#ffffff', markeredgewidth=1.5)[0]
             for _ in range(N_ELECTRONS)]
trails = [ax.plot([], [], [], color=C_ORBIT, alpha=0.7, linewidth=2)[0]
          for _ in range(N_ELECTRONS)]

# (ring plane angle, phase offset) per electron
electron_specs = [
    (plane_angle, plane_angle + e * (2 * np.pi / ELECTRONS_PER_RING))
    for plane_angle in plane_angles
    for e in range(ELECTRONS_PER_RING)
]

frame_angles = np.linspace(0, 2 * np.pi, FRAMES, endpoint=False)


def init():
    for marker, trail in zip(electrons, trails):
        marker.set_data([], [])
        marker.set_3d_properties([])
        trail.set_data([], [])
        trail.set_3d_properties([])
    return electrons + trails


def update(frame_idx):
    t = frame_angles[frame_idx]
    for i, (plane_angle, phase) in enumerate(electron_specs):
        a = t + phase

        ex, ey, ez = ring_point(a, plane_angle)
        electrons[i].set_data([ex], [ey])
        electrons[i].set_3d_properties([ez])

        t_trail = np.linspace(a - TRAIL_SPAN, a, TRAIL_POINTS)
        tx, ty, tz = ring_point(t_trail, plane_angle)
        trails[i].set_data(tx, ty)
        trails[i].set_3d_properties(tz)
    return electrons + trails


# blit=False: matplotlib blitting targets 2D artists. Line3D objects must be
# re-projected whenever the camera moves, so blitting leaves stale pixels while
# the user rotates the view.
ani = animation.FuncAnimation(fig, update, frames=FRAMES, init_func=init,
                              interval=INTERVAL_MS, blit=False)

ax.set_title(f"Electron Orbit  |  {ORBIT_RINGS} rings x {ELECTRONS_PER_RING} e-"
             f"  =  {N_ELECTRONS} electrons",
             color='#f8fafc', fontsize=13, pad=12, fontweight='bold')

if __name__ == '__main__':
    plt.show()
