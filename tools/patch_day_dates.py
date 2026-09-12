import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update fallback plan days mapping
    old_mapping = """        days: preset.daily.map(d => ({
          day: d.day,
          date: new Date(startDt.getTime() + (d.day - 1) * 86400000).toISOString().split('T')[0],
          theme: d.theme,"""

    new_mapping = """        days: preset.daily.map(d => {
          const dayDate = new Date(startDt.getTime() + (d.day - 1) * 86400000);
          const isoDate = dayDate.toISOString().split('T')[0];
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const dateBadge = `${dayDate.getDate()} ${months[dayDate.getMonth()]}`;
          return {
            day: d.day,
            date: isoDate,
            date_display: `Day ${d.day} - ${dateBadge}`,
            theme: d.theme,"""

    if old_mapping in content:
        # Also need to fix the closing of the map function from })) to }));
        # Find where days: preset.daily.map ends
        content = content.replace(old_mapping, new_mapping, 1)
        # In the original, it ends with:
        #           ]
        #         }))
        #       };
        # We need to replace that occurrence with:
        #           ]
        #         };
        #       }))
        old_closing = """            }\n          ]\n        }))\n      };"""
        new_closing = """            }\n          ]\n        };\n      }))\n      };"""
        if old_closing in content:
            content = content.replace(old_closing, new_closing, 1)
            print(f"Patched fallback days mapping in {filepath}")
        else:
            print(f"Warning: Could not find old_closing in {filepath}")
    else:
        print(f"Warning: Could not find old_mapping in {filepath}")

    # 2. Add formatDayBadge helper before renderPlan
    format_helper = """    function formatDayBadge(d, planData) {
      if (d.date_display && d.date_display.includes(' - ')) {
        return d.date_display;
      }
      let dateStr = d.date;
      if (!dateStr && planData && planData.start_date) {
        const sParts = String(planData.start_date).split(/[-/]/).map(Number);
        if (sParts.length >= 3) {
          const dt = new Date(sParts[0], sParts[1] - 1, sParts[2] + ((d.day || 1) - 1));
          dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        }
      }
      if (dateStr) {
        const parts = String(dateStr).split(/[-/T ]/);
        if (parts.length >= 3) {
          const mIdx = parseInt(parts[1], 10) - 1;
          const dayVal = parseInt(parts[2], 10);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          if (mIdx >= 0 && mIdx < 12 && !isNaN(dayVal)) {
            return `Day ${d.day} - ${dayVal} ${months[mIdx]}`;
          }
        }
      }
      return `Day ${d.day}`;
    }\n\n    function renderPlan(data) {"""

    if "function formatDayBadge" not in content:
        content = content.replace("    function renderPlan(data) {", format_helper, 1)
        print(f"Added formatDayBadge helper in {filepath}")

    # 3. Replace day badge rendering in renderPlan
    old_badge = """<span class="bg-brand-600 text-white text-xs font-black px-2.5 py-1 rounded-md">${d.date_display || ('Day ' + d.day)}</span>"""
    new_badge = """<span class="bg-brand-600 text-white text-xs font-black px-2.5 py-1 rounded-md">${formatDayBadge(d, data)}</span>"""
    if old_badge in content:
        content = content.replace(old_badge, new_badge)
        print(f"Replaced day badge in {filepath}")
    else:
        print(f"Warning: Could not find old_badge in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

patch_file('d:/st8925lab/Travel-Assistance/index.html')
patch_file('d:/st8925lab/Travel-Assistance/prototype.html')
