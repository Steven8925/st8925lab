# -*- coding: utf-8 -*-
import os
import re
from pathlib import Path

HERE = Path(r"d:\st8925lab")
old_folder = HERE / "project-02"
new_folder = HERE / "iot-gen2-simulator-monitor"

if old_folder.exists() and not new_folder.exists():
    old_folder.rename(new_folder)
    print("Renamed folder project-02 -> iot-gen2-simulator-monitor")
elif new_folder.exists():
    print("Target folder iot-gen2-simulator-monitor already exists")

# Update config.js
cfg_path = HERE / "config.js"
cfg = cfg_path.read_text(encoding="utf-8")
cfg = cfg.replace(
    "{ id: '02', label: 'IOT GEN2 SIMULATOR & MONITOR', slug: 'project-02' }",
    "{ id: '02', label: 'IOT GEN2 SIMULATOR & MONITOR', slug: 'iot-gen2-simulator-monitor' }"
)
cfg_path.write_text(cfg, encoding="utf-8")
print("Updated config.js slug")

# Update README.md and PROMPT.md in the project folder
for fname in ["README.md", "PROMPT.md"]:
    p = new_folder / fname
    if p.exists():
        text = p.read_text(encoding="utf-8")
        text = text.replace("project-02", "iot-gen2-simulator-monitor")
        text = text.replace("/project-02/", "/iot-gen2-simulator-monitor/")
        p.write_text(text, encoding="utf-8")
        print(f"Updated {fname}")

print("Rename completed successfully!")
