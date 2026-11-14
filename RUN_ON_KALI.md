# Running Emma Revelation Web App on Your Kali Linux (`caleb@kali`)

## Quick Start (One Command)
After downloading `emma_revelation_webapp.zip` into your `~/Downloads` folder, run:

```bash
cd ~/Downloads
unzip -o emma_revelation_webapp.zip
cd emma-revelation
chmod +x start_all.sh
bash start_all.sh
```

Then open in your browser:
- **On your Kali PC**: `http://localhost:5173`
- **On your Phone (same Wi-Fi)**: `http://192.168.1.51:5173`

---

## Note on Your Kali Terminal (`nodejs : Conflicts: npm`)
In your terminal output:
1. You already have **Node.js `v25.2.1` and `npm 11.15.0`** installed via `nvm` (`/home/caleb/.config/nvm/versions/node/v25.2.1/bin/node`), AND **NodeSource `nodejs 24.21.0`** installed system-wide (which already bundles `npm` inside the `nodejs` package, causing Debian's separate `npm` package to conflict).
2. **You do NOT need to run `sudo apt install nodejs npm`** — your `node` and `npm` are already installed and ready!

---

## Manual Commands (If You Prefer Not Using `start_all.sh`)
```bash
cd ~/Downloads/emma-revelation
npm install
npm run dev
```

To build a production bundle (`dist/`):
```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```


## Publishing your content (v1.1)
1. Run `npm run dev`, open the site, scroll to the footer and press **Studio**.
2. Fill in the profile, add tracks and events (mark an event *Shown on Site* to make it public).
3. Press **Export for publishing**. A file named `content.json` downloads.
4. Replace `public/content.json` in the project with that file, then run `npm run build` and deploy the `dist` folder.
5. Visitors now see your content. Your own browser keeps its local copy (it is marked as the owner browser).
Private inquiries, phone numbers and fees are **not** written to `content.json`.
Use **Backup (all data)** for a full private backup of everything in your browser.

## Hand-over and backup (v1.2)
Your content lives in the browser you use for Studio, so keep a copy outside it.
1. **Every time you finish editing:** Studio → **Backup (all data)**. Save the file somewhere safe (a second drive or a cloud folder). It includes private inquiries and phone numbers, so do not post it publicly.
2. **Publishing copy:** Studio → **Export for publishing**. Keep each `content.json` you publish (name them by date) so you can go back to an earlier version.
3. **New computer or new owner:** open the site in the new browser, press **Studio**, use the Import button with the backup file, check the Tracks, Events and Profile tabs, then export for publishing again.
4. **Clearing the browser deletes the local copy.** Without a backup file the content cannot be recovered.
5. **Declined or cancelled requests:** set the event status to *Declined or cancelled*. It is hidden from the public site and from the published file automatically, and the record is kept for your history.
6. **Retiring the site:** export a final backup, remove or replace `public/content.json`, and take down the deployed `dist` folder. Remove the EmailJS keys from `.env.local` and from the EmailJS dashboard if you stop using them.

