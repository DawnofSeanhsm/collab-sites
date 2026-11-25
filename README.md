# Collab sites

Two static pages (no build step) and the Google Sheet script behind them.

| Folder | What it is | Vercel project Root Directory |
| --- | --- | --- |
| `barbam-lechamber/` | Barbam x Le Chamber booking page (Dec 7 and 8) | `barbam-lechamber` |
| `seoulsweets-notredon/` | Seoul Sweets x Notre Don page, game, leaderboard, dessert holds | `seoulsweets-notredon` |
| `apps-script/Code.gs` | Script that lives inside the "Collab Signups" Google Sheet. Not deployed by Vercel: paste it into the sheet's Apps Script editor. | none |

Each page has one file to edit: `config.js` in its folder. A push to `main` redeploys both Vercel projects.
