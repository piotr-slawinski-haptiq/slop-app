# Project skills (local copy)

These skills are a **local copy** of your global agent skills, so the same skills are available in this project without depending on your user profile.

- **Source:** `~/.cursor/skills/` and `~/.cursor/skills-cursor/`
- **Copied:** 17 skills from `skills/` + 6 from `skills-cursor/` (23 total)

To refresh from global (e.g. after updating skills elsewhere):

```bash
# From repo root
rm -rf .cursor/skills/*
cp -R ~/.cursor/skills/* .cursor/skills/
cp -R ~/.cursor/skills-cursor/* .cursor/skills/
```

Edit skills here to customize behavior for this repo only; changes stay local and don’t affect your global skills.
