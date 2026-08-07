import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# 建立 3D 畫布
fig = plt.figure(figsize=(7, 7), dpi=100, facecolor='#0f172a')
ax = fig.add_subplot(111, projection='3d', facecolor='#0f172a')

# 隱藏座標軸與網格
ax.set_axis_off()
ax.set_xlim(-1.8, 1.8)
ax.set_ylim(-1.8, 1.8)
ax.set_zlim(-1.8, 1.8)

# 畫原子核 (中間紅色球體)
ax.scatter([0], [0], [0], color='#ef4444', s=250, edgecolors='#fca5a5', linewidth=2, zorder=10)

# 定義 4 個傾斜 3D 軌道面角度
num_orbits = 4
orbit_angles = np.linspace(0, np.pi, num_orbits, endpoint=False)
radius = 1.3
theta = np.linspace(0, 2 * np.pi, 200)

# 計算並畫出固定 3D 軌道環
orbit_lines = []
for angle in orbit_angles:
    # 在 2D 平面建立圓環，並旋轉到 3D 空間
    x0 = radius * np.cos(theta)
    y0 = radius * np.sin(theta)
    z0 = np.zeros_like(theta)
    
    # 繞 Y 軸傾斜 + 繞 Z 軸旋轉
    tilt = np.radians(65)
    x = x0 * np.cos(angle) - (y0 * np.cos(tilt)) * np.sin(angle)
    y = x0 * np.sin(angle) + (y0 * np.cos(tilt)) * np.cos(angle)
    z = y0 * np.sin(tilt)
    
    ax.plot(x, y, z, color='#38bdf8', linestyle='-', alpha=0.5, linewidth=1.5)

# 動態電子與尾跡物件
electrons = [ax.plot([], [], [], 'o', color='#38bdf8', markersize=9, markeredgecolor='#ffffff', markeredgewidth=1.5)[0] for _ in range(num_orbits)]
trails = [ax.plot([], [], [], color='#38bdf8', alpha=0.7, linewidth=2)[0] for _ in range(num_orbits)]

def init():
    for e, t in zip(electrons, trails):
        e.set_data([], [])
        e.set_3d_properties([])
        t.set_data([], [])
        t.set_3d_properties([])
    return electrons + trails

frames_count = 80
frame_angles = np.linspace(0, 2 * np.pi, frames_count, endpoint=False)

def update(frame_idx):
    current_t = frame_angles[frame_idx]
    
    for i, angle in enumerate(orbit_angles):
        # 每個軌道電子旋轉角度（可帶有相位差）
        t_elec = current_t + (i * np.pi / 2)
        
        tilt = np.radians(65)
        # 電子位置
        x0 = radius * np.cos(t_elec)
        y0 = radius * np.sin(t_elec)
        
        x = x0 * np.cos(angle) - (y0 * np.cos(tilt)) * np.sin(angle)
        y = x0 * np.sin(angle) + (y0 * np.cos(tilt)) * np.cos(angle)
        z = y0 * np.sin(tilt)
        
        electrons[i].set_data([x], [y])
        electrons[i].set_3d_properties([z])
        
        # 電子尾跡
        t_trail = np.linspace(t_elec - 0.5, t_elec, 15)
        xt0 = radius * np.cos(t_trail)
        yt0 = radius * np.sin(t_trail)
        
        xt = xt0 * np.cos(angle) - (yt0 * np.cos(tilt)) * np.sin(angle)
        yt = xt0 * np.sin(angle) + (yt0 * np.cos(tilt)) * np.cos(angle)
        zt = yt0 * np.sin(tilt)
        
        trails[i].set_data(xt, yt)
        trails[i].set_3d_properties(zt)
        
    return electrons + trails

ani = animation.FuncAnimation(fig, update, frames=frames_count, init_func=init, blit=True, interval=30)
ax.set_title("3D Rutherford-Bohr Atomic Orbit Model", color='#f8fafc', fontsize=14, pad=12, fontweight='bold')

plt.show()
