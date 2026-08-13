import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def get_earth_landmass_polygons():
    """
    Returns high-level continent & island boundary polygons in (lat, lon) degrees.
    """
    polygons = []
    
    # 1. North America (USA, Canada, Mexico)
    polygons.append([
        (70, -165), (72, -140), (70, -100), (60, -65), (48, -52), (25, -80), 
        (10, -83), (15, -92), (20, -105), (32, -117), (48, -125), (60, -140), (65, -168)
    ])
    
    # 2. South America
    polygons.append([
        (12, -73), (8, -60), (-5, -35), (-22, -40), (-35, -57), (-54, -68), 
        (-45, -75), (-18, -70), (-5, -80), (8, -77)
    ])
    
    # 3. Eurasia (Europe + Asia)
    polygons.append([
        (70, 25), (75, 80), (70, 140), (60, 165), (55, 140), (42, 130), (35, 120), 
        (22, 114), (10, 105), (10, 78), (25, 62), (12, 44), (30, 32), (36, 36), 
        (42, 28), (36, -5), (44, -9), (50, 1), (58, 6), (62, 5), (68, 14)
    ])
    
    # 4. Africa
    polygons.append([
        (36, -5), (32, 32), (12, 44), (11, 51), (-12, 40), (-34, 26), (-34, 18), 
        (-5, 12), (5, 0), (4, -8), (15, -17), (28, -13)
    ])
    
    # 5. Australia
    polygons.append([
        (-12, 130), (-14, 142), (-25, 153), (-38, 148), (-35, 117), (-22, 114)
    ])
    
    # 6. Japan Islands
    polygons.append([
        (45, 142), (40, 140), (35, 136), (32, 130), (34, 132), (38, 140)
    ])
    
    # 7. Southeast Asia Islands
    polygons.append([
        (6, 117), (4, 115), (-1, 110), (-3, 114), (0, 118)
    ])
    polygons.append([
        (18, 121), (14, 121), (10, 123), (7, 125), (12, 125)
    ])
    
    return polygons

def prepare_taiwan_night_image(image_path, target_size):
    """
    Loads Maru/night view/images.jpg, crops strictly to Taiwan's glowing lights bounding box,
    resizes to target_size (80% of sphere diameter), and returns RGBA Image.
    """
    if not os.path.exists(image_path):
        print(f"Warning: Image not found at {image_path}")
        return None

    img = Image.open(image_path).convert("RGBA")
    np_img = np.array(img, dtype=np.float32)
    r, g, b, a = np_img[:, :, 0], np_img[:, :, 1], np_img[:, :, 2], np_img[:, :, 3]
    brightness = 0.299 * r + 0.587 * g + 0.114 * b
    
    # Alpha mask from brightness for crisp glowing city lights & transparent ocean
    alpha_mask = np.clip(brightness * 2.8, 0, 255).astype(np.uint8)
    np_img[:, :, 3] = alpha_mask
    
    clean_img = Image.fromarray(np_img.astype(np.uint8), mode="RGBA")
    
    # Crop strictly to non-transparent bounding box of Taiwan island
    bbox = clean_img.getbbox()
    if bbox:
        clean_img = clean_img.crop(bbox)
        
    w, h = clean_img.size
    aspect = w / float(h)
    if aspect > 1.0:
        new_w = int(target_size)
        new_h = int(target_size / aspect)
    else:
        new_h = int(target_size)
        new_w = int(target_size * aspect)
        
    resized_img = clean_img.resize((new_w, new_h), resample=Image.LANCZOS)
    return resized_img

def generate_night_city_lights(num_lights=1200):
    """
    Generates realistic global city light clusters.
    """
    np.random.seed(42)
    city_clusters = [
        (35.6, 139.6, 6.0, 60, "Tokyo/Japan"),
        (31.2, 121.4, 7.0, 70, "Shanghai/East China"),
        (22.3, 114.1, 5.0, 50, "Hong Kong/Guangdong"),
        (1.3, 103.8, 3.0, 30, "Singapore"),
        (28.6, 77.2, 8.0, 65, "India North"),
        (19.0, 72.8, 6.0, 50, "Mumbai"),
        (51.5, -0.1, 8.0, 75, "London/UK"),
        (48.8, 2.3, 8.0, 70, "Paris/Central Europe"),
        (40.7, -74.0, 9.0, 80, "US East Coast"),
        (34.0, -118.2, 7.0, 60, "US West Coast"),
        (19.4, -99.1, 5.0, 40, "Mexico City"),
        (-23.5, -46.6, 6.0, 50, "Sao Paulo"),
        (30.0, 31.2, 4.0, 40, "Cairo/Nile"),
        (-33.8, 151.2, 4.0, 35, "Sydney/SE Australia"),
        (55.7, 37.6, 5.0, 40, "Moscow")
    ]
    
    city_lights = []
    for (c_lat, c_lon, rad, count, _) in city_clusters:
        for _ in range(count):
            d_lat = np.random.normal(0, rad * 0.45)
            d_lon = np.random.normal(0, rad * 0.55)
            l_type = np.random.choice([0, 1, 2, 3], p=[0.55, 0.25, 0.15, 0.05])
            city_lights.append((c_lat + d_lat, c_lon + d_lon, l_type))
            
    land_polys = get_earth_landmass_polygons()
    for _ in range(350):
        poly = land_polys[np.random.randint(len(land_polys))]
        lats = [p[0] for p in poly]
        lons = [p[1] for p in poly]
        lat = np.random.uniform(min(lats), max(lats))
        lon = np.random.uniform(min(lons), max(lons))
        l_type = np.random.choice([0, 1, 2], p=[0.7, 0.2, 0.1])
        city_lights.append((lat, lon, l_type))
        
    return city_lights

def build_perfect_sci_fi_renderer():
    final_w, final_h = 720, 720
    scale = 2  # Render at 1440x1440 for sub-pixel anti-aliasing
    width, height = final_w * scale, final_h * scale
    
    fps = 24
    num_frames = 240  # 240 frames @ 24 fps = 10.0 Seconds Exact Cycle
    
    center_x, center_y = width / 2.0, height / 2.0
    sphere_radius = 122.5 * scale  # Sphere radius
    sphere_diameter = sphere_radius * 2.0
    
    print(f"Initializing 3D Night Earth Engine with Embedded Taiwan Night Image (80% sphere size, 10s pulse cycle) ({width}x{height}) ...")

    # Prepare Taiwan night image: EXACTLY 80% of sphere diameter, centered
    taiwan_img_path = r"c:\Users\win87\Desktop\個人網站\Maru\night view\images.jpg"
    target_img_size = sphere_diameter * 0.80  # 80% of sphere diameter
    taiwan_centered_img = prepare_taiwan_night_image(taiwan_img_path, target_img_size)

    font_path = 'C:/Windows/Fonts/segoeui.ttf'
    if not os.path.exists(font_path):
        font_path = 'C:/Windows/Fonts/arialbd.ttf'
        
    center_text_font = ImageFont.truetype(font_path, int(22 * scale))

    land_polygons = get_earth_landmass_polygons()
    city_lights = generate_night_city_lights()
    
    def latlon_to_3d(lat_deg, lon_deg, r=sphere_radius):
        lat = math.radians(lat_deg)
        lon = math.radians(lon_deg)
        x = r * math.cos(lat) * math.sin(lon)
        y = r * math.sin(lat)
        z = r * math.cos(lat) * math.cos(lon)
        return x, y, z

    lat_lines = []
    for i in range(-75, 80, 15):
        pts = []
        for j in range(-180, 185, 5):
            pts.append(latlon_to_3d(i, j))
        lat_lines.append(pts)

    lon_lines = []
    for j in np.arange(-180, 180, 22.5):
        pts = []
        for i in range(-85, 90, 5):
            pts.append(latlon_to_3d(i, j))
        lon_lines.append(pts)

    land_polys_3d = []
    for poly in land_polygons:
        pts_3d = []
        for (lat, lon) in poly:
            pts_3d.append(latlon_to_3d(lat, lon))
        land_polys_3d.append(pts_3d)

    city_lights_3d = []
    for (lat, lon, ltype) in city_lights:
        x, y, z = latlon_to_3d(lat, lon)
        city_lights_3d.append((x, y, z, ltype))

    np.random.seed(99)
    network_arcs_3d = []
    sample_nodes = city_lights_3d[::6]
    for i in range(len(sample_nodes)):
        for j in range(i + 1, min(i + 15, len(sample_nodes))):
            p1 = np.array(sample_nodes[i][:3])
            p2 = np.array(sample_nodes[j][:3])
            dist = np.linalg.norm(p1 - p2)
            if sphere_radius * 0.3 < dist < sphere_radius * 0.95:
                arc_pts = []
                num_arc = 12
                for k in range(num_arc + 1):
                    frac = k / float(num_arc)
                    pt = (1 - frac) * p1 + frac * p2
                    norm_pt = pt / np.linalg.norm(pt)
                    arc_r = sphere_radius * (1.0 + 0.04 * math.sin(frac * math.pi))
                    arc_pts.append(norm_pt * arc_r)
                network_arcs_3d.append(arc_pts)

    # -------------------------------------------------------------
    # B. 6 Symmetrical Orbit Trajectories (Evenly Placed 360°)
    # -------------------------------------------------------------
    num_orbits = 6
    orbit_angles = [(i / float(num_orbits)) * math.pi for i in range(num_orbits)]
    tilt = math.radians(65)
    r_orbit = sphere_radius * 1.68
    particles_per_orbit = 20  # 20 * 6 = 120 particles total across 6 orbits
    
    particle_specs = []
    p_counter = 0
    orbit_colors = [(0, 240, 255), (0, 210, 255), (255, 190, 40), (0, 255, 210), (0, 225, 255), (255, 205, 50)]
    
    for i, angle in enumerate(orbit_angles):
        base_col = orbit_colors[i % len(orbit_colors)]
        for j in range(particles_per_orbit):
            phase = (j / float(particles_per_orbit)) * 2.0 * math.pi + (i * math.pi / 3.0)
            
            if p_counter % 7 == 0:
                c_glow = (255, 200, 40) # Gold
            elif p_counter % 4 == 0:
                c_glow = (255, 255, 255) # White
            else:
                c_glow = base_col
                
            particle_specs.append({
                'id': p_counter,
                'orbit_index': i,
                'angle': angle,
                'phase': phase,
                'color_glow': c_glow,
                'size': 3.4 * scale if (p_counter % 2 == 0) else 2.6 * scale,
                'twinkle_freq': 3.0 + (p_counter % 5) * 0.8
            })
            p_counter += 1

    # Camera Perspective Parameters (pitch = 0 for perfect core centering)
    camera_z = 1100.0 * scale
    pitch = 0.0
    cos_p, sin_p = math.cos(pitch), math.sin(pitch)

    def project(x, y, z):
        y_rot = y * cos_p - z * sin_p
        z_rot = y * sin_p + z * cos_p
        sz = camera_z / (camera_z - z_rot)
        px = center_x + x * sz
        py = center_y + y_rot * sz
        return px, py, z_rot, sz

    # Pure Black Background (#000000)
    bg_arr = np.zeros((height, width, 3), dtype=np.float32)

    rendered_frames = []

    print(f"Rendering {num_frames} frames (10.0s cycle) with 10s brightness pulse on Taiwan night image...")

    for f in range(num_frames):
        # Progress t: 0.0 to 1.0 over 10.0 seconds
        t_loop = f / float(num_frames)
        rotation_360 = t_loop * 2.0 * math.pi
        
        frame_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame_img)
        
        cos_sp, sin_sp = math.cos(rotation_360), math.sin(rotation_360)

        # -------------------------------------------------------------
        # 1. 3D Night Earth Atmosphere Rim ONLY (Pure Black Center)
        # -------------------------------------------------------------
        r_rim = sphere_radius * 1.015
        draw.ellipse(
            [center_x - r_rim, center_y - r_rim, center_x + r_rim, center_y + r_rim],
            outline=(0, 168, 255, 190), width=int(2.2 * scale)
        )

        # -------------------------------------------------------------
        # 2. 3D Continents, Grid Lines, Network Arcs & City Lights
        # -------------------------------------------------------------
        for lat in lat_lines:
            pts_2d = []
            for (x, y, z) in lat:
                xr = x * cos_sp + z * sin_sp
                zr = -x * sin_sp + z * cos_sp
                px, py, z_rot, sz = project(xr, y, zr)
                pts_2d.append((px, py, z_rot))
                
            for i in range(len(pts_2d) - 1):
                p1, p2 = pts_2d[i], pts_2d[i + 1]
                avg_z = (p1[2] + p2[2]) / 2.0
                if avg_z < sphere_radius * 0.3:
                    alpha = int(np.clip(100 - (avg_z / sphere_radius) * 80, 15, 160))
                    draw.line([(p1[0], p1[1]), (p2[0], p2[1])], fill=(0, 140, 220, alpha), width=int(1.0 * scale))

        for lon in lon_lines:
            pts_2d = []
            for (x, y, z) in lon:
                xr = x * cos_sp + z * sin_sp
                zr = -x * sin_sp + z * cos_sp
                px, py, z_rot, sz = project(xr, y, zr)
                pts_2d.append((px, py, z_rot))
                
            for i in range(len(pts_2d) - 1):
                p1, p2 = pts_2d[i], pts_2d[i + 1]
                avg_z = (p1[2] + p2[2]) / 2.0
                if avg_z < sphere_radius * 0.3:
                    alpha = int(np.clip(100 - (avg_z / sphere_radius) * 80, 15, 160))
                    draw.line([(p1[0], p1[1]), (p2[0], p2[1])], fill=(0, 140, 220, alpha), width=int(1.0 * scale))

        for poly_3d in land_polys_3d:
            pts_2d = []
            for (x, y, z) in poly_3d:
                xr = x * cos_sp + z * sin_sp
                zr = -x * sin_sp + z * cos_sp
                px, py, z_rot, sz = project(xr, y, zr)
                pts_2d.append((px, py, z_rot))
                
            for i in range(len(pts_2d)):
                p1 = pts_2d[i]
                p2 = pts_2d[(i + 1) % len(pts_2d)]
                avg_z = (p1[2] + p2[2]) / 2.0
                if avg_z < sphere_radius * 0.2:
                    alpha = int(np.clip(160 - (avg_z / sphere_radius) * 90, 30, 230))
                    draw.line([(p1[0], p1[1]), (p2[0], p2[1])], fill=(0, 210, 255, alpha), width=int(1.5 * scale))

        for arc in network_arcs_3d:
            arc_2d = []
            for pt in arc:
                x, y, z = pt[0], pt[1], pt[2]
                xr = x * cos_sp + z * sin_sp
                zr = -x * sin_sp + z * cos_sp
                px, py, z_rot, sz = project(xr, y, zr)
                arc_2d.append((px, py, z_rot))
                
            for i in range(len(arc_2d) - 1):
                p1, p2 = arc_2d[i], arc_2d[i + 1]
                avg_z = (p1[2] + p2[2]) / 2.0
                if avg_z < sphere_radius * 0.2:
                    alpha = int(np.clip(90 - (avg_z / sphere_radius) * 70, 15, 150))
                    draw.line([(p1[0], p1[1]), (p2[0], p2[1])], fill=(0, 220, 255, alpha), width=int(1.0 * scale))

        # Render global city lights
        for (x, y, z, ltype) in city_lights_3d:
            xr = x * cos_sp + z * sin_sp
            zr = -x * sin_sp + z * cos_sp
            px, py, z_rot, sz = project(xr, y, zr)
            
            if z_rot < sphere_radius * 0.2:
                alpha = int(np.clip(190 - (z_rot / sphere_radius) * 65, 40, 255))
                r_n = (1.8 * scale) * sz
                
                if ltype == 0:
                    col = (255, 176, 32, alpha)
                elif ltype == 1:
                    col = (255, 215, 0, alpha)
                elif ltype == 2:
                    col = (255, 255, 255, alpha)
                else:
                    col = (0, 240, 255, alpha)
                    
                draw.ellipse([px - r_n, py - r_n, px + r_n, py + r_n], fill=col)

        # -------------------------------------------------------------
        # Embed Taiwan Night View Image (images.jpg)
        # 10-second pulse modulation (bright -> dim -> bright)
        # 80% of sphere diameter, centered
        # -------------------------------------------------------------
        if taiwan_centered_img is not None:
            img_w, img_h = taiwan_centered_img.size
            pos_x = int(center_x - img_w / 2.0)
            pos_y = int(center_y - img_h / 2.0)
            
            # Smooth 10-second cosine brightness pulse (fades smoothly between 20% and 100%)
            pulse_mult = 0.20 + 0.80 * (0.5 * (1.0 + math.cos(t_loop * 2.0 * math.pi)))
            
            np_t = np.array(taiwan_centered_img, dtype=np.float32)
            np_t[:, :, 3] = np_t[:, :, 3] * pulse_mult
            pulsed_img = Image.fromarray(np_t.astype(np.uint8), mode="RGBA")
            
            frame_img.alpha_composite(pulsed_img, dest=(pos_x, pos_y))

        # -------------------------------------------------------------
        # 3. 6 Displayed 3D Orbit Line Tracks ("軌跡要顯示出來")
        # -------------------------------------------------------------
        for angle_idx, angle in enumerate(orbit_angles):
            t_col = orbit_colors[angle_idx % len(orbit_colors)]
            num_t = 120
            t_pts = []
            for i in range(num_t):
                ang = (i / float(num_t)) * 2.0 * math.pi
                x0 = r_orbit * math.cos(ang)
                y0 = r_orbit * math.sin(ang)
                
                x = x0 * math.cos(angle) - (y0 * math.cos(tilt)) * math.sin(angle)
                y = x0 * math.sin(angle) + (y0 * math.cos(tilt)) * math.cos(angle)
                z = y0 * math.sin(tilt)
                
                px, py, z_rot, sz = project(x, y, z)
                t_pts.append((px, py, z_rot))
                
            for i in range(0, num_t, 2):
                p1 = t_pts[i]
                p2 = t_pts[(i + 1) % num_t]
                alpha = int(np.clip(90 + (p1[2] / (sphere_radius * 2)) * 75, 20, 140))
                draw.line([(p1[0], p1[1]), (p2[0], p2[1])], fill=(*t_col, alpha), width=int(1.3 * scale))

        # -------------------------------------------------------------
        # 4. Center ST8925lab Text (Perfectly Centered at Core)
        # -------------------------------------------------------------
        b_text = 0.5 * (1.0 + math.cos(t_loop * 2.0 * math.pi * 3.33))
        
        text_str = "ST8925lab"
        bbox = center_text_font.getbbox(text_str)
        t_x = center_x - (bbox[0] + bbox[2]) / 2.0
        t_y = center_y - (bbox[1] + bbox[3]) / 2.0
        
        # Max brightness reduced by 70% (max opacity 30% of 255)
        alpha_text = int(255 * 0.30 * b_text)
        
        if alpha_text > 2:
            # 50% Gray RGB(128, 128, 128)
            draw.text((t_x, t_y), text_str, font=center_text_font, fill=(128, 128, 128, alpha_text))

        # -------------------------------------------------------------
        # 5. 120 Electron Light Points Orbiting Transformation Formula
        #    from c:\Users\win87\Desktop\個人網站\circle\import numpy as np.py
        # -------------------------------------------------------------
        elements = []
        trail_steps = 7
        
        for p in particle_specs:
            angle = p['angle']
            base_phase = p['phase']
            c_glow = p['color_glow']
            base_size = p['size']
            t_freq = p['twinkle_freq']
            
            twinkle = 0.20 + 0.80 * ((math.sin(base_phase * t_freq + rotation_360 * 4.0) + 1.0) / 2.0)
            
            for step in range(trail_steps):
                dt_angle = step * 0.035
                cur_rot = rotation_360 - dt_angle
                t_elec = base_phase + cur_rot
                
                x0 = r_orbit * math.cos(t_elec)
                y0 = r_orbit * math.sin(t_elec)
                
                x = x0 * math.cos(angle) - (y0 * math.cos(tilt)) * math.sin(angle)
                y = x0 * math.sin(angle) + (y0 * math.cos(tilt)) * math.cos(angle)
                z = y0 * math.sin(tilt)
                
                px, py, z_rot, sz = project(x, y, z)
                
                decay = (1.0 - (step / float(trail_steps)))**1.5
                elements.append({
                    'px': px,
                    'py': py,
                    'z': z_rot,
                    'sz': sz,
                    'is_head': (step == 0),
                    'decay': decay,
                    'c_glow': c_glow,
                    'base_size': base_size,
                    'twinkle': twinkle
                })
                
        elements.sort(key=lambda item: item['z'])
        
        for elem in elements:
            px, py, z_pos, sz = elem['px'], elem['py'], elem['z'], elem['sz']
            is_head, decay, twinkle = elem['is_head'], elem['decay'], elem['twinkle']
            c_glow, base_size = elem['c_glow'], elem['base_size']
            
            dist_to_center = math.hypot(px - center_x, py - center_y)
            occlusion = 1.0
            if z_pos < -sphere_radius * 0.2 and dist_to_center < sphere_radius:
                occlusion = 0.30 + 0.70 * (dist_to_center / sphere_radius)
                
            alpha_val = int(255 * decay * occlusion * (twinkle if is_head else 0.85))
            p_radius = base_size * sz * (1.0 if is_head else (0.35 + 0.65 * decay))
            
            if alpha_val > 10:
                if is_head:
                    draw.ellipse(
                        [px - p_radius * 1.5, py - p_radius * 1.5, px + p_radius * 1.5, py + p_radius * 1.5],
                        fill=(*c_glow, alpha_val)
                    )
                    core_r = p_radius * 0.75
                    draw.ellipse(
                        [px - core_r, py - core_r, px + core_r, py + core_r],
                        fill=(255, 255, 255, alpha_val)
                    )
                else:
                    tr_r = p_radius * 0.70
                    draw.ellipse(
                        [px - tr_r, py - tr_r, px + tr_r, py + tr_r],
                        fill=(*c_glow, int(alpha_val * 0.80))
                    )

        comp_np = np.array(frame_img, dtype=np.float32)
        comp_rgb = comp_np[:, :, :3]
        comp_alpha = (comp_np[:, :, 3:] / 255.0)
        
        frame_rgb = bg_arr * (1.0 - comp_alpha) + comp_rgb * comp_alpha
        frame_rgb = np.clip(frame_rgb, 0, 255).astype(np.uint8)
        
        frame_final = Image.fromarray(frame_rgb, mode="RGB")
        frame_resized = frame_final.resize((final_w, final_h), resample=Image.LANCZOS)
        rendered_frames.append(frame_resized)
        
        if (f + 1) % 48 == 0 or f == num_frames - 1:
            print(f"Processed frame {f+1}/{num_frames} ({int((f+1)/num_frames*100)}%)")

    # Save master_00.png preview frame from frame 0
    rendered_frames[0].save(os.path.join(os.path.dirname(__file__), "master_00.png"))
    print("Saved crisp preview to master_00.png")

    # -------------------------------------------------------------
    # D. Master GIF Generation with Optimal Global Palette
    # -------------------------------------------------------------
    out_gif = os.path.join(os.path.dirname(__file__), "sci_fi_128_electron_sphere.gif")
    print("Building optimal global color palette across loop keyframes...")
    
    sample_indices = [0, 40, 80, 120, 160, 200, 239]
    sample_frames = [rendered_frames[idx] for idx in sample_indices]
    
    collage = Image.new("RGB", (final_w * 2, final_h * 4))
    collage.paste(sample_frames[0], (0, 0))
    collage.paste(sample_frames[1], (final_w, 0))
    collage.paste(sample_frames[2], (0, final_h))
    collage.paste(sample_frames[3], (final_w, final_h))
    collage.paste(sample_frames[4], (0, final_h * 2))
    collage.paste(sample_frames[5], (final_w, final_h * 2))
    collage.paste(sample_frames[6], (0, final_h * 3))
    
    master_palette_img = collage.quantize(colors=256, method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE)

    print(f"Quantizing all {num_frames} frames with unified master palette...")
    palette_frames = []
    for img in rendered_frames:
        q_frame = img.quantize(palette=master_palette_img, dither=Image.Dither.NONE)
        palette_frames.append(q_frame)
        
    print(f"Saving crystal-clear GIF to {out_gif} ...")
    palette_frames[0].save(
        out_gif,
        save_all=True,
        append_images=palette_frames[1:],
        duration=int(1000 / fps),
        loop=0,
        optimize=True
    )
    print("FINISHED! 10-Second Taiwan Night View Pulse GIF rendered with perfection.")

if __name__ == "__main__":
    build_perfect_sci_fi_renderer()
