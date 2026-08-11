# KIDZ STYLE – KI-Anbindung

## Bestehende Bilddateien
Die vorhandenen Dateien `01-monogramm.png` bis `09-animal.png` bleiben im Projekt-Hauptordner.

## Vercel
1. `index.html`, `package.json` und den Ordner `api` ins Repository laden.
2. In Vercel: Project → Settings → Environment Variables.
3. Variable `OPENAI_API_KEY` anlegen und deinen OpenAI API Key als Wert eintragen.
4. Danach Redeploy auslösen.

Der API-Key gehört niemals in `index.html`.
