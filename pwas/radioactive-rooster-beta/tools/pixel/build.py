"""Regenerate art/pixel/ from code. Usage: python3 tools/pixel/build.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from chars import rooster_portrait, gobbler_portrait, rooster_squat, rooster_crow

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "art", "pixel")
out = []

def save(cv, rel):
    path = os.path.join(ROOT, rel + ".png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv.save(path)
    out.append(rel)

for m in ["talk", "smitten", "embarrassed", "crow"]:
    save(rooster_portrait(m), f"portrait/rooster-{m}")
save(gobbler_portrait(), "portrait/gobbler")
save(rooster_squat(), "sprite/rooster-squat")
save(rooster_crow(), "sprite/rooster-crow")
# Scene and item art is on hold until the story is settled (drafts kept outside the game).
print(len(out), "files:", ", ".join(out))
