# HANDOVER.md

> Update this file at the end of every session. Archive the previous version to `HANDOVER_ARCHIVE/HANDOVER_<date>.md` before overwriting.

## Stand: 2026-05-09

### Kurzfassung

Das Projekt ist ein n8n-basiertes Automatenlager-System mit Google Sheets als Arbeits- und Logschicht. Es verarbeitet Rechnungen, Produktvorschlaege, Nayax-Verkaeufe, FIFO-Lagerchargen, MDB-/Slot-Historisierung und MHD-/Bestandswarnungen. Zusaetzlich gibt es ein lokales Dashboard unter `http://127.0.0.1:8787/`, das Workflows, Live-n8n-Status und Datenqualitaet sichtbar macht.

Der wichtigste Architekturpunkt: WF2 darf keine aktive Maschinenbelegung erzeugen. WF4 ist allein fuer aktive MDB-/Slot-Zuordnungen und Historisierung zustaendig.

### Was in dieser Session passiert ist

- WF5 wurde fachlich korrigiert:
  - Tagesverkaeufe bleiben in der Mail-Zusammenfassung enthalten.
  - `Bestand im Automat` wird separat aus `current_machine_qty` angezeigt.
  - `Bestand gesamt` wird aus der Summe aktiver Lagerchargen je `product_key` gesetzt.
  - Die alte Doppelzaehlung `current_machine_qty + remaining_qty` wurde entfernt.
  - Die missverstaendliche Mailzeile `Lagerbestand` wurde entfernt.
- Vorheriger Handover-Stand wurde archiviert unter `HANDOVER_ARCHIVE/HANDOVER_2026-05-09_before-wf5-stock-fix.md`.

### Was bisher gebaut wurde

#### Workflows

- `WF1 - Rechnungseingang automatisch mit Claude.json`
  - verarbeitet Rechnungseingang
  - bereitet Claude-/KI-Auswertung vor
  - prueft gegen Stammdaten
  - startet WF2 per Execute Workflow

- `WF2 - Smart Product Selection - Rechnungsvorschlaege freigeben.json`
  - verarbeitet Rechnungsvorschlaege
  - legt Produktstamm, Aliase und Lagerchargen an
  - ist fuer Rechnungsvorschlagsfreigabe zustaendig
  - kann WF4 optional fuer direkte Slotzuordnung starten
  - darf keine aktive Slotbelegung als Nebenwirkung setzen

- `WF3 Nayax Lynx FIFO Lagerbestand - manueller Abruf - mit WF4 Integration.json`
  - verarbeitet Nayax-Verkaeufe
  - nutzt FIFO fuer Lagerchargen
  - schreibt `Verarbeitete_Transaktionen`
  - ProductName bleibt primaeres Matching
  - MDB-Code ist Kontrollsignal
  - kann bei MDB-Abweichungen WF4 vorbereiten

- `WF4 - MDB Produktzuordnung bearbeiten.json`
  - historisiert Produkt-/MDB-/Slotwechsel
  - schliesst alte aktive Produktzeilen
  - ergaenzt vorhandene WF2-Produktzeilen ohne Slotdaten, statt neue Dubletten zu erzeugen
  - blockt doppelte aktive Slotzeilen
  - schreibt Produktwechsel-Log und Hinweise

- `WF5 - MHD und niedrige Lagercharge ueberwachen.json`
  - prueft aktive Lagerchargen auf MHD innerhalb 30 Tagen
  - prueft niedrige Bestaende
  - wertet Tagesverkaeufe aus `Verarbeitete_Transaktionen` aus
  - erzeugt Hinweise
  - sendet eine Mail-Zusammenfassung
  - zeigt `Bestand im Automat` und `Bestand gesamt`, ohne Automatenbestand doppelt zu zaehlen

- `WF0 - product_slot_id Backfill.json`
  - einmaliger Reparaturworkflow
  - erzeugt fehlende `product_slot_id` fuer aktive Slotzeilen
  - nicht fuer laufenden Tagesbetrieb gedacht

#### Dashboard

Das Dashboard wurde in `dashboard/` gebaut.

Es kann:

- lokale Workflow-JSONs analysieren
- Live-n8n-Workflows per API lesen
- Workflow-Aktionen als Buttons anzeigen
- Formulare oeffnen oder Webhook-Workflows starten
- Google Sheets live lesen, sofern per Link/CSV erreichbar
- sonst auf lokale XLSX-Datei zurueckfallen
- Datenqualitaetsprobleme anzeigen:
  - aktive Zeilen ohne `product_slot_id`
  - doppelte aktive Slotbelegungen
  - verwaiste Lagerchargen
  - niedrige Restbestaende / MHD-Warnungen

Lokaler Start:

```powershell
cd dashboard
npm start
```

Dashboard-URL:

```text
http://127.0.0.1:8787/
```

### Was funktioniert

- Lokale Dashboard-App mit Node.js-Server und HTML/CSS/JS-Frontend.
- Dashboard liest `.env.local` aus Projektwurzel oder `dashboard/`.
- Dashboard kann n8n per API auslesen, wenn `N8N_API_KEY` gesetzt ist.
- Dashboard zeigt operative Buttons fuer WF1 bis WF5. WF0 ist nicht im Dashboard als Tagesaktion vorgesehen.
- Code-Nodes mit `.first()` oder `$items(...)` stehen in den geprueften lokalen Workflow-JSONs auf `runOnceForAllItems`.
- `.env.local`, Dashboard-Logs und lokale Patchskripte sind fuer Git ausgeschlossen.

### Naechster konkreter Schritt

Der naechste sinnvolle Entwicklungsschritt ist WF5 in n8n zu importieren bzw. den live Workflow damit zu ersetzen und einen kontrollierten Testlauf auszufuehren.

Dabei unbedingt beachten:

```text
Aktive Lagercharge remaining_qty = Gesamtbestand inklusive Automatenbestand.
```

Deshalb darf WF5 bei `Bestand gesamt` nicht rechnen:

```text
current_machine_qty + remaining_qty
```

Sondern:

```text
Bestand im Automat = current_machine_qty
Bestand gesamt = Summe aktive Lagerchargen.remaining_qty je product_key
```

Testcheckliste:

1. WF5-Mail mit echten Tagesverkaeufen testen.
2. Anzeige in der Mail pruefen:
   - Heute verkauft
   - MHD abgelaufen / laeuft bald ab
   - Niedriger Bestand
   - Bestand im Automat
   - Bestand gesamt
3. Testlauf in n8n ausfuehren.
4. Erst danach WF5 produktiv freigeben bzw. aktiviert lassen.

### Sicherheitsvorfall 2026-05-09 – Nayax Bearer-Token (behoben)

- Der Nayax Bearer-Token stand im Klartext in `WF3...json` und wurde von GitHub Secret Scanning erkannt.
- Der Token wurde aus der JSON entfernt. Der Platzhalter lautet jetzt `Bearer NAYAX_TOKEN_IN_N8N_CREDENTIAL_EINTRAGEN`.
- **Pflichtaktion:** Den alten Token sofort im Nayax-/Moma-Portal sperren und einen neuen generieren.
- Den neuen Token ausschliesslich als n8n-Credential (`HTTP Header Auth`) hinterlegen, niemals direkt in Workflow-JSON schreiben.
- Die Git-History wurde per `git filter-repo` bereinigt, sodass der Token auch in aelteren Commits nicht mehr vorhanden ist.

### Bekannte Probleme und technische Schulden

- `dashboard/.env.local` enthaelt lokalen n8n API-Zugang und darf nicht committed werden.
- `dashboard/logs/` enthaelt Laufzeitlogs und darf nicht committed werden.
- `patch_wf5_daily_sales.py` ist ein lokales Einmal-/Patchskript und ist bewusst ignoriert.
- WF5 ist lokal korrigiert, aber noch nicht in n8n live getestet/importiert.
- Live-n8n-Workflows und lokale JSON-Dateien koennen auseinanderlaufen. Vor produktiven Aenderungen immer klaeren, ob die lokale JSON oder der live exportierte n8n-Workflow fuehrend ist.
- Langfristig waere eine Trennung von Produktstamm und Slot-Historie sauberer als beide Konzepte in `Produkte` zu fuehren.

### Wichtige fachliche Regeln

- WF2 ist fuer Produktstamm, Alias, Lagercharge und Rechnungsvorschlaege zustaendig.
- WF2 ist nicht fuer `active = TRUE`, `machine_id`, `mdb_code`, `product_slot_id`, `valid_from_datetime` oder `valid_to_datetime` zustaendig.
- WF4 ist die einzige Wahrheit fuer aktive MDB-/Slot-Zuordnungen.
- `active = TRUE` bedeutet aktive Slotbelegung, nicht Produktexistenz.
- ProductName bleibt im Verkaufsworkflow vorerst fuehrendes Matching.
- MDB-Code ist aktuell Kontrollsignal und Warn-/WF4-Ausloeser.
- Keine automatische produktive Aenderung in Nayax/Moma.
- Google Sheets wird nicht manuell gepflegt, sondern ueber n8n Forms und Workflows.

### Relevante Google-Sheets-Tabs

- `Produkte`
- `Lagerchargen`
- `Produkt_Aliase`
- `Produktwechsel_Log`
- `Fehler_und_Hinweise`
- `Verarbeitete_Transaktionen`
- `Produkt_Aenderungsvorschlaege`
- `Bestandskorrektur_Vorschlaege` geplant
- `Bestandskorrekturen_Log` geplant

### Hinweise fuer Claude Code

1. Zuerst `README.md`, `ARCHITECTURE.md` und `CLAUDE.md` lesen.
2. Danach die lokalen Workflow-JSONs nicht blind ueberschreiben, sondern mit live n8n abgleichen.
3. Keine Secrets aus `dashboard/.env.local` ausgeben oder committen.
4. Bei n8n-Code-Nodes, die `.first()` oder `$items(...)` verwenden, immer `Run Once for All Items` setzen.
5. Bei WF2/WF4-Aenderungen die Eigentuemerschaft beachten:
   - WF2 Produkt/Lager/Rechnung
   - WF4 Slot/Historie
6. Vor jedem produktiven Import in n8n mindestens einen Testlauf mit Testdaten machen.
