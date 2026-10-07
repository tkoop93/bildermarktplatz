# Nebentisch

**Wer hier ist, ist nicht weit.**

Mobile-first MVP für spontane, ortsgebundene Mikro-Communities in Bars, Cafés und Events.

## MVP

- Ortsraum unter `/l/[slug]`
- Einstieg ohne Konto, nur mit Nickname
- Impulse mit 30/60/120 Minuten Laufzeit
- Kategorien wie Getränk, Quatschen, Sport, Ideen und Flirt
- „🙋 Bin dabei“-Reaktionen
- lokale Demo via localStorage
- vorbereitetes Supabase-Schema für Mehrnutzerbetrieb
- PWA-Manifest
- Netlify-Konfiguration

## Schnellstart

```bash
npm install
npm run dev
```

Dann `http://localhost:3000/l/lowinerei` öffnen.

## Supabase aktivieren

1. Supabase-Projekt anlegen.
2. `supabase/schema.sql` im SQL Editor ausführen.
3. `.env.example` nach `.env.local` kopieren und URL + anon key eintragen.
4. Den localStorage-Adapter im Ortsraum durch Supabase Realtime ersetzen.

## Produktentscheidungen

- Kein Chat in V1.
- Kein Account-Zwang.
- Beiträge verfallen.
- Ort statt GPS-Radar.
- Dating ist nur eine Kategorie.
- Der QR-Code am realen Ort ist der zentrale Einstieg.

## Backup

Der vorherige Bildermarktplatz-Stand wurde vor der Umstellung auf dem Branch
`archive/bildermarktplatz-before-nebentisch` gesichert.
