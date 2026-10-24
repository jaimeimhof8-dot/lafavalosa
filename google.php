<?php
/* =========================================================
   La Favolosa – Google-Daten (Öffnungszeiten & Bewertungen)
   ---------------------------------------------------------
   Holt Öffnungszeiten, Sternebewertung und Rezensionen der
   Lokale aus dem Google-Unternehmensprofil (Places API) und
   liefert sie als JSON an die Website.

   - Der API-Schlüssel bleibt auf dem Server (config.php).
   - Ergebnisse werden zwischengespeichert (cache/google.json),
     die API wird nur alle `cache_hours` Stunden angefragt.
   - Schlägt die API fehl, werden die letzten guten Daten
     ausgeliefert; ohne Daten greift die Website auf
     google-snapshot.js bzw. content.js zurück.
   ========================================================= */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function out(array $data, int $status = 200, int $maxAge = 600): never
{
    http_response_code($status);
    header('Cache-Control: public, max-age=' . $maxAge);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$config = require __DIR__ . '/config.php';
$g = $config['google'] ?? [];
$key = trim((string)($g['api_key'] ?? ''));
$places = $g['places'] ?? [];
$ttl = max(1, (int)($g['cache_hours'] ?? 6)) * 3600;

if ($key === '' || str_starts_with($key, 'BITTE-ERSETZEN') || !$places) {
    out(['ok' => false, 'error' => 'not-configured'], 503, 60);
}

$dir = __DIR__ . '/cache';
$file = $dir . '/google.json';
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}
// Cache-Ordner nicht öffentlich ausliefern
if (is_dir($dir) && !is_file($dir . '/.htaccess')) {
    @file_put_contents($dir . '/.htaccess', "Require all denied\n");
}

$cached = null;
if (is_file($file)) {
    $cached = json_decode((string)file_get_contents($file), true);
    if (!is_array($cached)) {
        $cached = null;
    }
}
$fresh = $cached && (time() - (int)($cached['_ts'] ?? 0)) < $ttl;
if ($fresh) {
    unset($cached['_ts'], $cached['_ids']);
    out($cached);
}

/* ---------- Aktualisierung (nur ein Prozess gleichzeitig) ---------- */
$lock = @fopen($dir . '/google.lock', 'c');
if ($lock) {
    flock($lock, LOCK_EX);
    // Während des Wartens kann ein anderer Prozess schon aktualisiert haben
    clearstatcache(true, $file);
    if (is_file($file)) {
        $again = json_decode((string)file_get_contents($file), true);
        if (is_array($again) && (time() - (int)($again['_ts'] ?? 0)) < $ttl) {
            unset($again['_ts'], $again['_ids']);
            out($again);
        }
    }
}

function api(string $method, string $url, string $key, string $mask, ?array $body = null): ?array
{
    $headers = [
        'Content-Type: application/json',
        'X-Goog-Api-Key: ' . $key,
        'X-Goog-FieldMask: ' . $mask,
    ];
    $payload = $body !== null ? json_encode($body, JSON_UNESCAPED_UNICODE) : null;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => $method,
        ]);
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }
        $res = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $payload ?? '',
            'timeout' => 8,
            'ignore_errors' => true,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        $code = 0;
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) {
                $code = (int)$m[1];
            }
        }
    }
    if ($res === false || $code !== 200) {
        return null;
    }
    $data = json_decode((string)$res, true);
    return is_array($data) ? $data : null;
}

/** Google-Zeit (Tag, Stunde, Minute) -> Minuten seit Wochenbeginn (So = 0). */
function weekMinutes(array $t): int
{
    return ((int)($t['day'] ?? 0) * 24 + (int)($t['hour'] ?? 0)) * 60 + (int)($t['minute'] ?? 0);
}

function clock(int $minutes): string
{
    return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
}

/**
 * Perioden -> ['mo' => [["09:00","23:00"], …], …]. Zeiten nach Mitternacht werden als 24:xx notiert.
 * Perioden einer Sonntag->Samstag-Woche; ein Ende nach Mitternacht läuft in den nächsten Tag hinein.
 */
function weekHours(array $periods): array
{
    $keys = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
    $week = ['mo' => [], 'di' => [], 'mi' => [], 'do' => [], 'fr' => [], 'sa' => [], 'so' => []];
    foreach ($periods as $p) {
        if (!isset($p['open'])) {
            continue;
        }
        $day = (int)$p['open']['day'];
        $start = (int)$p['open']['hour'] * 60 + (int)$p['open']['minute'];
        if (!isset($p['close'])) {
            $end = 24 * 60; // rund um die Uhr
        } else {
            $span = weekMinutes($p['close']) - weekMinutes($p['open']);
            if ($span <= 0) {
                $span += 7 * 24 * 60;
            }
            $end = $start + $span;
        }
        $week[$keys[$day]][] = [clock($start), clock(min($end, 36 * 60))];
    }
    foreach ($week as $k => $ranges) {
        usort($ranges, fn($a, $b) => strcmp($a[0], $b[0]));
        $week[$k] = $ranges;
    }
    return $week;
}

function placeToArray(string $id, array $p): array
{
    $dayKeys = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];

    $regular = weekHours($p['regularOpeningHours']['periods'] ?? []);
    $hasHours = !empty($p['regularOpeningHours']['periods']);

    // Abweichungen in den nächsten 7 Tagen (Feiertage, Sonderzeiten) aus currentOpeningHours
    $exceptions = [];
    if ($hasHours && !empty($p['currentOpeningHours']['periods'])) {
        $byDate = [];
        foreach ($p['currentOpeningHours']['periods'] as $per) {
            $d = $per['open']['date'] ?? null;
            if (!$d) {
                continue;
            }
            $iso = sprintf('%04d-%02d-%02d', $d['year'], $d['month'], $d['day']);
            $start = (int)$per['open']['hour'] * 60 + (int)$per['open']['minute'];
            if (isset($per['close'])) {
                $span = weekMinutes($per['close']) - weekMinutes($per['open']);
                if ($span <= 0) {
                    $span += 7 * 24 * 60;
                }
                $end = $start + $span;
            } else {
                $end = 24 * 60;
            }
            $byDate[$iso][] = [clock($start), clock(min($end, 36 * 60))];
        }
        $zurich = new DateTimeZone('Europe/Zurich');
        for ($i = 0; $i < 7; $i++) {
            $date = (new DateTimeImmutable('today', $zurich))->modify("+$i day");
            $iso = $date->format('Y-m-d');
            $key = $dayKeys[(int)$date->format('w')];
            $actual = $byDate[$iso] ?? [];
            usort($actual, fn($a, $b) => strcmp($a[0], $b[0]));
            if ($actual !== $regular[$key]) {
                $exceptions[] = [
                    'datum' => $iso,
                    'zeiten' => $actual ?: null,
                    'text' => 'Sonderöffnungszeiten',
                ];
            }
        }
    }

    $reviews = [];
    foreach ($p['reviews'] ?? [] as $r) {
        $text = trim((string)($r['text']['text'] ?? $r['originalText']['text'] ?? ''));
        $reviews[] = [
            'lokal' => $id,
            'autor' => (string)($r['authorAttribution']['displayName'] ?? ''),
            'autorUri' => (string)($r['authorAttribution']['uri'] ?? ''),
            'sterne' => (int)($r['rating'] ?? 0),
            'zeit' => (string)($r['relativePublishTimeDescription'] ?? ''),
            'text' => $text,
            'sprache' => (string)($r['text']['languageCode'] ?? ''),
            'uri' => (string)($r['googleMapsUri'] ?? ''),
        ];
    }

    return [
        'place' => [
            'placeId' => (string)($p['id'] ?? ''),
            'name' => (string)($p['displayName']['text'] ?? ''),
            'rating' => isset($p['rating']) ? (float)$p['rating'] : null,
            'count' => (int)($p['userRatingCount'] ?? 0),
            'status' => (string)($p['businessStatus'] ?? 'OPERATIONAL'),
            'maps' => (string)($p['googleMapsUri'] ?? ''),
            'adresse' => (string)($p['formattedAddress'] ?? ''),
            'telefon' => (string)($p['nationalPhoneNumber'] ?? ''),
            'zeiten' => $hasHours ? $regular : null,
            'ausnahmen' => $exceptions,
        ],
        'reviews' => $reviews,
    ];
}

$ids = $cached['_ids'] ?? [];
$result = ['ok' => true, 'quelle' => 'google-places', 'stand' => gmdate('c'), 'lokale' => [], 'bewertungen' => []];
$failed = 0;

$mask = 'id,displayName,formattedAddress,nationalPhoneNumber,googleMapsUri,rating,userRatingCount,businessStatus,'
    . 'regularOpeningHours,currentOpeningHours,reviews';

foreach ($places as $slug => $def) {
    $pid = trim((string)($def['place_id'] ?? '')) ?: ($ids[$slug] ?? '');

    // Place ID einmalig per Textsuche ermitteln und im Cache merken
    if ($pid === '' && !empty($def['query'])) {
        $found = api('POST', 'https://places.googleapis.com/v1/places:searchText', $key, 'places.id',
            ['textQuery' => $def['query'], 'languageCode' => 'de', 'regionCode' => 'CH', 'maxResultCount' => 1]);
        $pid = (string)($found['places'][0]['id'] ?? '');
        if ($pid !== '') {
            $ids[$slug] = $pid;
        }
    }

    $data = $pid !== '' ? api('GET', 'https://places.googleapis.com/v1/places/' . rawurlencode($pid) . '?languageCode=de&regionCode=CH', $key, $mask) : null;

    if ($data === null) {
        $failed++;
        // Letzte guten Daten dieses Lokals behalten
        if (isset($cached['lokale'][$slug])) {
            $result['lokale'][$slug] = $cached['lokale'][$slug];
            foreach ($cached['bewertungen'] ?? [] as $r) {
                if (($r['lokal'] ?? '') === $slug) {
                    $result['bewertungen'][] = $r;
                }
            }
        }
        continue;
    }

    $parts = placeToArray($slug, $data);
    $result['lokale'][$slug] = $parts['place'];
    foreach ($parts['reviews'] as $r) {
        $result['bewertungen'][] = $r;
    }
}

if (!$result['lokale']) {
    // Nichts Brauchbares: Website nutzt Snapshot / content.js
    out(['ok' => false, 'error' => 'unavailable'], 502, 60);
}

// Bei Teilausfall nur kurz zwischenspeichern, damit bald neu versucht wird
$store = $result + ['_ts' => $failed ? time() - $ttl + 900 : time(), '_ids' => $ids];
@file_put_contents($file, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);

out($result);
