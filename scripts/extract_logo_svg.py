import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
from scipy.ndimage import gaussian_filter

# Open high-res source image
src = Image.open('Minimalist Arenas Logo on Black.png').convert('L')
arr = np.array(src, dtype=float)

# Bounding box of emblem: y in [310, 725], x in [360, 895]
# Let's crop emblem with slight padding
y_min, y_max = 310, 725
x_min, x_max = 360, 895
crop = arr[y_min:y_max, x_min:x_max]

# Gentle gaussian smoothing to ensure mathematically smooth contour lines
smooth = gaussian_filter(crop, sigma=0.8)

# Find contour at midpoint luminance 128
fig, ax = plt.subplots()
cs = ax.contour(smooth, levels=[128])

def rdp_simplify(points, epsilon=0.9):
    """Ramer-Douglas-Peucker algorithm to create clean, sharp, compact polygons."""
    if len(points) < 3:
        return points
    line_vec = points[-1] - points[0]
    line_len = np.linalg.norm(line_vec)
    if line_len == 0:
        dists = np.linalg.norm(points - points[0], axis=1)
    else:
        line_unit = line_vec / line_len
        vecs = points - points[0]
        proj = np.dot(vecs, line_unit)
        proj_pts = points[0] + np.outer(proj, line_unit)
        dists = np.linalg.norm(points - proj_pts, axis=1)
    
    dmax = np.max(dists)
    index = np.argmax(dists)
    if dmax > epsilon:
        r1 = rdp_simplify(points[:index+1], epsilon)
        r2 = rdp_simplify(points[index:], epsilon)
        return np.vstack((r1[:-1], r2))
    return np.array([points[0], points[-1]])

paths = []
# Extract all polygon contours
for p in cs.get_paths():
    for poly in p.to_polygons():
        if len(poly) > 25: # filter out noise
            simplified = rdp_simplify(poly, epsilon=0.9)
            paths.append(simplified)

plt.close(fig)

# Get bounding box of all simplified points to normalize viewBox exactly
all_pts = np.vstack(paths)
min_x, max_x = all_pts[:, 0].min(), all_pts[:, 0].max()
min_y, max_y = all_pts[:, 1].min(), all_pts[:, 1].max()

w = max_x - min_x
h = max_y - min_y
print(f'Emblem size: {w:.1f} x {h:.1f}, count of paths: {len(paths)}')

# Normalize coordinates to a clean 500x500 square viewBox with symmetric padding
target_size = 500
# Target width ~ 440, center in 500
scale = 430.0 / w
offset_x = (target_size - (w * scale)) / 2.0 - (min_x * scale)
offset_y = (target_size - (h * scale)) / 2.0 - (min_y * scale)

svg_path_strs = []
for poly in paths:
    norm_pts = poly * scale + np.array([offset_x, offset_y])
    d = 'M ' + ' L '.join(f'{pt[0]:.2f},{pt[1]:.2f}' for pt in norm_pts) + ' Z'
    svg_path_strs.append(d)

combined_d = ' '.join(svg_path_strs)

# 1. Output clean logo-mark.svg (using fill="currentColor")
svg_mark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" fill="currentColor">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{combined_d}" />
</svg>
'''
with open('public/brand/logo-mark.svg', 'w') as f:
    f.write(svg_mark)

# 2. Output favicon.svg with dark/light scheme support
# On dark browser tabs, it renders white. On light browser tabs, it renders obsidian.
svg_fav = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <style>
    path {{ fill: #000000; }}
    @media (prefers-color-scheme: dark) {{
      path {{ fill: #ffffff; }}
    }}
  </style>
  <path fill-rule="evenodd" clip-rule="evenodd" d="{combined_d}" />
</svg>
'''
with open('public/favicon.svg', 'w') as f:
    f.write(svg_fav)

# 3. Output full logo (emblem + ARENAS wordmark)
y_min_f, y_max_f = 310, 905
x_min_f, x_max_f = 200, 1050
crop_f = arr[y_min_f:y_max_f, x_min_f:x_max_f]
smooth_f = gaussian_filter(crop_f, sigma=0.8)

fig_f, ax_f = plt.subplots()
cs_f = ax_f.contour(smooth_f, levels=[128])
paths_f = []
for p in cs_f.get_paths():
    for poly in p.to_polygons():
        if len(poly) > 25:
            paths_f.append(rdp_simplify(poly, epsilon=0.9))
plt.close(fig_f)

all_pts_f = np.vstack(paths_f)
min_xf, max_xf = all_pts_f[:, 0].min(), all_pts_f[:, 0].max()
min_yf, max_yf = all_pts_f[:, 1].min(), all_pts_f[:, 1].max()

wf = max_xf - min_xf
hf = max_yf - min_yf
target_wf = 860
target_hf = int(target_wf * (hf / wf) + 40)
pad_f = 20
scale_f = (target_wf - 2 * pad_f) / wf
offset_xf = pad_f - (min_xf * scale_f)
offset_yf = pad_f - (min_yf * scale_f)

svg_path_strs_f = []
for poly in paths_f:
    norm_pts = poly * scale_f + np.array([offset_xf, offset_yf])
    d = 'M ' + ' L '.join(f'{pt[0]:.2f},{pt[1]:.2f}' for pt in norm_pts) + ' Z'
    svg_path_strs_f.append(d)

combined_df = ' '.join(svg_path_strs_f)
svg_full = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {target_wf} {target_hf}" fill="currentColor">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{combined_df}" />
</svg>
'''
with open('public/brand/logo-full.svg', 'w') as f:
    f.write(svg_full)

print('Successfully generated public/brand/logo-mark.svg, public/favicon.svg, and public/brand/logo-full.svg!')

