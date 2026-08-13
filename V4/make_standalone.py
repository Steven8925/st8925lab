#!/usr/bin/env python3
"""Bundle the site into ONE self-contained HTML file.

Inlines config.js, geodata.js and app.js into index.html, and inlines the
project page as a hidden overlay so clicking a project works with no server
and no second file. 打包為單一檔案，無需伺服器即可驗收。

The overlay exists because a standalone file has no sibling project.html to
navigate to. On the real site the click navigates normally; here it reveals
the overlay instead, which is why PROJECT_URL is left untouched and only the
navigation call is swapped.
單檔版沒有可導向的 project.html，故改以覆蓋層呈現；PROJECT_URL 不動，
只替換導向動作本身。
"""
import re, pathlib, sys

d = pathlib.Path(__file__).resolve().parent
html = (d / 'index.html').read_text(encoding='utf-8')
cfg  = (d / 'config.js').read_text(encoding='utf-8')
geo  = (d / 'geodata.js').read_text(encoding='utf-8')
app  = (d / 'app.js').read_text(encoding='utf-8')

# Swap the real navigation for the overlay. Everything else in app.js,
# including the burst and its timing, is used unmodified.
needle = ('    setTimeout(() => {\n'
          '        // Carry the ring\'s ACTUAL hue, not its index, because the palette is\n'
          '        // reshuffled per load. 傳遞實際色相而非索引，因配色每次載入洗牌。\n'
          '        window.location.href = PROJECT_URL(PROJECTS[ringIndex].id,\n'
          '                                           ringColours[ringIndex].name);\n'
          '    }, BURST_DURATION);')
if needle not in app:
    sys.exit('ERROR: navigation block not found — app.js changed shape.')
app = app.replace(needle,
    '    setTimeout(() => {\n'
    '        window.__showProject(ringIndex);   // standalone overlay\n'
    '        navLocked = false;                 // allow repeat activation\n'
    '    }, BURST_DURATION);')

overlay = """
<div id="proj-overlay">
  <div id="proj-card">
    <div id="proj-halo"></div>
    <h1 id="proj-title">Welcome to Project</h1>
    <div id="proj-sub">ST8925 LAB</div>
    <div id="proj-proof"></div>
    <button id="proj-close">&larr; BACK TO ORBIT</button>
  </div>
</div>
<style>
  #proj-overlay{position:fixed;inset:0;z-index:60;display:none;
    align-items:center;justify-content:center;background:rgba(4,7,14,.93);
    backdrop-filter:blur(6px);}
  #proj-overlay.on{display:flex;}
  #proj-card{--c:#fff;text-align:center;display:flex;flex-direction:column;
    align-items:center;gap:22px;padding:40px 26px;}
  #proj-halo{width:82px;height:82px;border-radius:50%;
    background:radial-gradient(circle,#fff 0%,var(--c) 38%,transparent 72%);
    animation:projpulse 2.6s ease-in-out infinite;}
  @keyframes projpulse{0%,100%{transform:scale(1);opacity:.92}
                       50%{transform:scale(1.14);opacity:1}}
  #proj-title{font-size:clamp(22px,5vw,38px);color:var(--c);letter-spacing:.06em;}
  #proj-sub{color:#64748b;font-size:12px;letter-spacing:.2em;}
  #proj-proof{border:1px solid color-mix(in srgb,var(--c) 34%,transparent);
    border-radius:10px;padding:15px 20px;font-size:12.5px;line-height:2;
    color:#64748b;text-align:left;min-width:min(400px,88vw);}
  #proj-proof b{color:var(--c);}
  #proj-close{background:none;border:0;border-bottom:1px solid transparent;
    color:#64748b;font:inherit;font-size:13px;letter-spacing:.1em;
    cursor:pointer;padding-bottom:2px;}
  #proj-close:hover{color:var(--c);border-color:var(--c);}
</style>
<script>
window.__showProject = function (i) {
    // ringColours is the SHUFFLED assignment actually on screen. Using
    // RAINBOW[i] here would show a different colour from the one clicked,
    // which is only correct about 1 time in 12.
    // ringColours 才是畫面上實際的洗牌結果；用 RAINBOW[i] 會顯示不同顏色。
    const p = PROJECTS[i], c = ringColours[i];
    const card = document.getElementById('proj-card');
    card.style.setProperty('--c', c.hex);
    document.getElementById('proj-title').textContent = 'Welcome to ' + p.label;
    document.getElementById('proj-proof').innerHTML =
        '<div>project id &nbsp; <b>' + p.id + '</b></div>' +
        '<div>ring index &nbsp; <b>' + i + '</b></div>' +
        '<div>palette hue &nbsp; <b>' + c.name + '</b> &nbsp; <b>' + c.hex + '</b></div>' +
        '<div>total projects &nbsp; <b>' + PROJECTS.length + '</b></div>' +
        '<div style="opacity:.6;letter-spacing:0;line-height:1.5;margin-top:8px">' +
        'Standalone preview. On the real site this is project.html?id=' + p.id +
        '.<br>單檔預覽版；實際站台為獨立頁面。</div>';
    document.getElementById('proj-overlay').classList.add('on');
};
document.getElementById('proj-close').onclick = () =>
    document.getElementById('proj-overlay').classList.remove('on');
document.getElementById('proj-overlay').onclick = e => {
    if (e.target.id === 'proj-overlay') e.currentTarget.classList.remove('on');
};
</script>
"""

html = html.replace('<script src="config.js"></script>',  '<script>\n' + cfg + '\n</script>')
html = html.replace('<script src="geodata.js"></script>', '<script>\n' + geo + '\n</script>')
html = html.replace('<script src="app.js"></script>',     '<script>\n' + app + '\n</script>')
html = html.replace('</body>', overlay + '\n</body>')

for tag in ('config.js', 'geodata.js', 'app.js'):
    if f'src="{tag}"' in html:
        sys.exit(f'ERROR: {tag} was not inlined.')

out = d / 'ST8925-LAB-standalone.html'
out.write_text(html, encoding='utf-8')
print(f'wrote {out.name}  {out.stat().st_size:,} bytes')
