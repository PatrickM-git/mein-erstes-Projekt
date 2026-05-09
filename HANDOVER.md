# HANDOVER.md

> Update this file at the end of every session. Archive the previous version to `HANDOVER_ARCHIVE/HANDOVER_<date>.md` before overwriting.

## Stand: 2026-05-09 (Session 2)

### Kurzfassung

Das Projekt ist ein n8n-basiertes Automatenlager-System mit Google Sheets als Arbeits- und Logschicht.
Es verarbeitet Rechnungen, Produktvorschlaege, Nayax-Verkaeufe, FIFO-Lagerchargen, MDB-/Slot-Historisierung
und MHD-/Bestandswarnungen. Das lokale Dashboard laeuft unter `http://127.0.0.1:8787/` und zeigt
Workflows, Live-n8n-Status, Datenqualitaet und enthalt jetzt eine Einstellungsseite fuer den API-Key.

Der wichtigste Architekturpunkt: WF2 darf keine aktive Maschinenbelegung erzeugen.
WF4 ist allein fuer aktive MDB-/Slot-Zuordnungen und Historisierung zustaendig.

### Was in dieser Session passiert ist

#### 1. Projekt-Infrastruktur eingerichtet
- `CLAUDE.md`, `HANDOVER.md` und `HANDOVER_ARCHIVE/` im Projekt-Root angelegt.
- Git-Identitaet (`PatrickM-git` / `patrickzinke@gmx.net`) global konfiguriert.

#### 2. Sicherheitsvorfall behoben – Nayax Bearer-Token
- GitHub Secret Scanning hatte den echten Nayax Bearer-Token in `WF3...json` erkannt.
- Token durch Platzhalter `Bearer NAYAX_TOKEN_IN_N8N_CREDENTIAL_EINTRAGEN` ersetzt.
- Git-History vollstaendig per `git filter-repo` bereinigt (Token in keinem Commit mehr vorhanden).
- Alter Token wurde vom Nutzer im Nayax-/Moma-Portal geloescht und neu erstellt.
- Neuer Token wird ausschliesslich als n8n-Credential gespeichert, nicht in JSON-Dateien.
- `CLAUDE.md` um Pflichtsektion „Security Rules" ergaenzt.

#### 3. Malware-Alarm behoben – VBScript entfernt
- `dashboard/start-dashboard-hidden.vbs` wurde von Bitdefender als Malware eingestuft.
- Ursache: VBScript startete PowerShell mit `window style 0` (versteckt) – klassisches Malware-Muster.
- Datei geloescht. Ersatz: PowerShell direkt mit `-WindowStyle Hidden` aufrufen.
- `create-dashboard-startup-shortcut.ps1` zeigt jetzt direkt auf `powershell.exe -WindowStyle Hidden`.
- `register-dashboard-autostart.ps1` (Task Scheduler) um `-WindowStyle Hidden -NonInteractive` ergaenzt.
- `*.vbs` in `.gitignore` geblockt, damit VBS-Dateien nie wieder eingecheckt werden koennen.

#### 4. Dashboard-Einstellungsseite hinzugefuegt
- Neuer Navigationspunkt „⚙ Einstellungen" im Dashboard.
- n8n Base-URL und API-Key koennen direkt im Browser eingetragen werden.
- Speicherort: `dashboard/.dashboard-config.json` (lokal, gitignored, nie committed).
- API-Key wird vom Server **niemals** im Klartext zurueckgegeben – nur maskiert (`eyJa••••••••Uuj0`).
- Neue API-Endpunkte: `GET /api/config` und `POST /api/config`.
- Prioritaetsreihenfolge: `process.env` > `.dashboard-config.json` > `.env.local`.
- Formular sperrt sich automatisch, wenn Key per Umgebungsvariable gesetzt ist.

### Was bisher gebaut wurde

#### Workflows

- `WF1 - Rechnungseingang automatisch mit Claude.json`
  - verarbeitet Rechnungseingang, bereitet Claude-Auswertung vor, startet WF2

- `WF2 - Smart Product Selection - Rechnungsvorschlaege freigeben.json`
  - legt Produktstamm, Aliase und Lagerchargen an
  - darf keine aktive Slotbelegung als Nebenwirkung setzen
  - kann WF4 optional starten

- `WF3 Nayax Lynx FIFO Lagerbestand - manueller Abruf - mit WF4 Integration.json`
  - verarbeitet Nayax-Verkaeufe per FIFO
  - Nayax-Token: **nur als n8n-Credential** eintragen, nie in JSON schreiben

- `WF4 - MDB Produktzuordnung bearbeiten.json`
  - historisiert Produkt-/MDB-/Slotwechsel
  - einzige Quelle fuer aktive Slotbelegungen

- `WF5 - MHD und niedrige Lagercharge ueberwachen.json`
  - MHD- und Bestandspruefung, Mail-Zusammenfassung
  - `Bestand im Automat` = `current_machine_qty`
  - `Bestand gesamt` = Summe aktiver Lagerchargen je `product_key` (NICHT + `current_machine_qty`)

- `WF0 - product_slot_id Backfill.json`
  - einmaliger Reparaturworkflow, nicht fuer Tagesbetrieb

#### Dashboard (`dashboard/`)

- Node.js-Server + HTML/CSS/JS-Frontend
- Laedt live aus Google Sheets, faellt auf lokale XLSX zurueck
- Zeigt Workflow-Aktionen, n8n-Live-Status, MHD-/Lager-Warnungen, Datenqualitaet
- **Neu:** Einstellungsseite fuer API-Key (kein Datei-Editor noetig)
- Autostart via Task Scheduler: `register-dashboard-autostart.ps1` als Admin ausfuehren

```powershell
cd dashboard
npm start
# http://127.0.0.1:8787/
```

### Was funktioniert (geprueft 2026-05-09)

- Dashboard laeuft, Google Sheets Live-Daten werden geladen (40 aktive Produktzeilen).
- Einstellungsseite erreichbar, API-Key kann ohne Datei-Editor gesetzt werden.
- `*.vbs` geblockt, kein Antivirus-Alarm mehr.
- Git-History sauber, kein Token in alten Commits.
- Alle 6 lokalen Workflow-JSONs werden geladen (16/18 Pruefungen ok).

### Naechster konkreter Schritt

WF5 in n8n importieren und testen:

1. Lokale `WF5...json` in n8n importieren (live Workflow ersetzen).
2. WF5-Testlauf ausfuehren.
3. Mail pruefen:
   - Tagesverkaeufe vorhanden
   - `Bestand im Automat` = `current_machine_qty`
   - `Bestand gesamt` = Summe aktiver Chargen (ohne Doppelzaehlung)
4. Erst nach erfolgreichem Test WF5 aktiviert lassen.

Neuen Nayax-Token in n8n eintragen:
- n8n oeffnen → Credentials → HTTP Header Auth anlegen
- Name z.B. `Nayax Bearer`
- Header: `Authorization`, Wert: `Bearer <neuer-token>`
- In WF3 den Nayax-Last-Sales-Node auf diese Credential umstellen.

### Bekannte Probleme und technische Schulden

- WF5 lokal korrigiert, aber noch nicht in n8n live getestet/importiert.
- n8n API-Key fuer Dashboard noch nicht eingetragen (Einstellungsseite benutzen).
- Live-n8n-Workflows und lokale JSONs koennen auseinanderlaufen – vor produktiven Aenderungen klaeren, welche Version fuehrend ist.
- `dashboard/logs/` und `patch_wf5_daily_sales.py` sind lokal und gitignored.
- Langfristig waere eine Trennung von Produktstamm und Slot-Historie sauberer.

### Wichtige fachliche Regeln

- WF2: Produktstamm, Alias, Lagercharge, Rechnungsvorschlaege.
- WF2: Nicht zustaendig fuer `active`, `machine_id`, `mdb_code`, `product_slot_id`, `valid_from/to_datetime`.
- WF4: Einzige Quelle fuer aktive MDB-/Slot-Zuordnungen.
- `active = TRUE` = aktive Slotbelegung, nicht Produktexistenz.
- Kein Token/Secret direkt in Workflow-JSON – immer n8n-Credential verwenden.
- Keine automatische produktive Aenderung in Nayax/Moma.
- Google Sheets wird ausschliesslich ueber n8n Forms und Workflows gepflegt.

### Relevante Google-Sheets-Tabs

- `Produkte`, `Lagerchargen`, `Produkt_Aliase`
- `Produktwechsel_Log`, `Fehler_und_Hinweise`
- `Verarbeitete_Transaktionen`, `Produkt_Aenderungsvorschlaege`
- `Bestandskorrektur_Vorschlaege` (geplant)
- `Bestandskorrekturen_Log` (geplant)

### Hinweise fuer Claude Code

1. Zuerst `README.md`, `ARCHITECTURE.md` und `CLAUDE.md` lesen.
2. Keine Tokens oder Secrets in Workflow-JSONs schreiben – immer n8n-Credential.
3. Vor Workflow-Aenderungen klaeren: lokale JSON oder live n8n fuehrend?
4. Code-Nodes mit `.first()` oder `$items(...)` immer auf `runOnceForAllItems` setzen.
5. WF2/WF4-Eigentuemer beachten: WF2 = Produkt/Lager/Rechnung, WF4 = Slot/Historie.
6. Vor produktivem n8n-Import mindestens einen Testlauf mit Testdaten machen.
7. API-Key fuer Dashboard: Einstellungsseite im Dashboard nutzen, nicht `.env.local` bearbeiten.
