# Docs edit package — 2026-10-21

These are DRAFT edits. Review each file in your editor or with `git diff`, then copy to your vault or repo `docs/` folder.

| File | Action | What changed |
|---|---|---|
| 03_Information_Architecture_and_User_Flows_md.md | Updated | Added "Units (split / combine)" under INVENTORY, after Stock Movements (two places). |
| 04_ERD_and_Database_Schema_md.md | Updated | Appended "Current implementation addendum" with unit tables and `unit` enum value. Original archive text unchanged. |
| 08_Current_Project_Status_md.md | Updated | Appended "Update 2026-10-21" section: unit status, blocker (migration not applied), purchase receive bug. |
| 09_Recovery_Notes.md | Created | New file (referenced by 00_README but missing in the project copy). Snapshot issue, DATABASE_URL override, credential exposure. |
| 10_Progress_Log_md.md | Updated | Added one dated entry for 2026-10-21 before the template. Older entries unchanged. |
| 11_Decision_Log_md.md | Updated | Added D-014 (unit operations never create negative stock), status ACCEPTED. |
| 00_README_START_HERE_md.md | Unchanged | Structure and protocol did not change. Note: it references `07_Technical_Architecture_Current.md`, which is not in the project copy. Create it or fix the reference. |
| 01, 02, 05, 06, 07 | Unchanged | No verified change. |

Not verified: migration applied to any database; UI applied to the repo or tested in a browser; production build.
