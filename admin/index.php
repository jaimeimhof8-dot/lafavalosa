<?php
/* =========================================================
   La Favolosa – Inhalte bearbeiten (Admin)
   ---------------------------------------------------------
   Der Kunde loggt sich ein und ändert Sorten, Hinweis-Banner,
   Ausnahmetage und Jobs. Gespeichert wird in data/content.json;
   daraus wird /content.js erzeugt, die die Website liest.

   Einrichtung: siehe GO-LIVE.md (Passwort-Hash in config.php).
   ========================================================= */

declare(strict_types=1);

$root = dirname(__DIR__);
$config = require $root . '/config.php';
$adminCfg = $config['admin'] ?? [];
$hash = (string)($adminCfg['password_hash'] ?? '');
$sessionSeconds = max(5, (int)($adminCfg['session_minutes'] ?? 60)) * 60;

$dataDir = $root . '/data';
$dataFile = $dataDir . '/content.json';
$backupDir = $dataDir . '/backup';
$jsFile = $root . '/content.js';

const LOKALE = [
    'alle' => 'Alle Lokale',
    'baelliz' => 'Bälliz',
    'muehleplatz' => 'Mühleplatz',
    'gwatt' => 'Gwatt',
    'bahnhof' => 'Bahnhof Thun',
    'muensingen' => 'Münsingen',
];
const MAX_BACKUPS = 20;

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");

/* ---------- Hilfsfunktionen ---------- */

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function jsonOut(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function today(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('Europe/Zurich')))->format('Y-m-d');
}

/** Bereinigt einen Text: Steuerzeichen raus, Leerraum glätten, kürzen. */
function cleanText(mixed $v, int $max): string
{
    if (!is_string($v)) {
        return '';
    }
    $v = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v) ?? '';
    $v = trim(preg_replace('/\s+/u', ' ', $v) ?? '');
    return mb_substr($v, 0, $max);
}

/** Liste von Texten: bereinigt, ohne Leere und Doppelte (Gross-/Kleinschreibung egal). */
function cleanList(mixed $list, int $maxLen, int $maxCount): array
{
    $out = [];
    $seen = [];
    foreach (is_array($list) ? $list : [] as $item) {
        $t = cleanText($item, $maxLen);
        $k = mb_strtolower($t);
        if ($t === '' || isset($seen[$k])) {
            continue;
        }
        $seen[$k] = true;
        $out[] = $t;
        if (count($out) >= $maxCount) {
            break;
        }
    }
    return $out;
}

function validDate(mixed $v): bool
{
    if (!is_string($v) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m)) {
        return false;
    }
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

function validTime(mixed $v): bool
{
    return is_string($v) && (bool)preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/', $v);
}

/** Übernimmt nur die bearbeitbaren Felder; alles andere (Lokal-Zeiten) bleibt wie es ist. */
function normalize(array $in, array $current): array
{
    $out = $current;

    $h = is_array($in['hinweis'] ?? null) ? $in['hinweis'] : [];
    $bis = $h['bis'] ?? '';
    $out['hinweis'] = [
        'aktiv' => !empty($h['aktiv']),
        'text' => cleanText($h['text'] ?? '', 160),
        'bis' => validDate($bis) ? $bis : '',
    ];

    $s = is_array($in['sorten'] ?? null) ? $in['sorten'] : [];
    $out['sorten'] = [
        'milch' => cleanList($s['milch'] ?? [], 40, 60),
        'sorbet' => cleanList($s['sorbet'] ?? [], 40, 60),
    ];

    $j = is_array($in['jobs'] ?? null) ? $in['jobs'] : [];
    $out['jobs'] = [
        'saison' => cleanText($j['saison'] ?? '', 20),
        'stellen' => cleanList($j['stellen'] ?? [], 60, 30),
    ];

    $exceptions = [];
    $now = today();
    foreach (is_array($in['ausnahmen'] ?? null) ? $in['ausnahmen'] : [] as $a) {
        if (!is_array($a) || !validDate($a['datum'] ?? null) || $a['datum'] < $now) {
            continue; // ungültig oder schon vorbei
        }
        $lokal = (string)($a['lokal'] ?? 'alle');
        if (!isset(LOKALE[$lokal])) {
            continue;
        }
        $z = $a['zeiten'] ?? null;
        $zeiten = null;
        if (is_array($z) && count($z) === 2 && validTime($z[0]) && validTime($z[1]) && $z[0] < $z[1]) {
            $zeiten = [$z[0], $z[1]];
        }
        $exceptions[] = [
            'lokal' => $lokal,
            'datum' => $a['datum'],
            'zeiten' => $zeiten,
            'text' => cleanText($a['text'] ?? '', 80),
        ];
        if (count($exceptions) >= 100) {
            break;
        }
    }
    usort($exceptions, fn($x, $y) => [$x['datum'], $x['lokal']] <=> [$y['datum'], $y['lokal']]);
    $out['ausnahmen'] = $exceptions;

    return $out;
}

function renderJs(array $data): string
{
    $json = json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
        | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
    );
    return "/* =========================================================\n"
        . "   LA FAVOLOSA – INHALTE (automatisch erzeugt)\n"
        . "   ---------------------------------------------------------\n"
        . "   Diese Datei wird vom Admin unter /admin/ geschrieben.\n"
        . "   Nicht von Hand ändern – Änderungen gehen beim nächsten\n"
        . "   Speichern im Admin verloren.\n"
        . "   ========================================================= */\n\n"
        . "window.FAVOLOSA = " . $json . ";\n";
}

/** Schreibt eine Datei sicher (temporäre Datei, dann umbenennen). */
function writeAtomic(string $path, string $content): bool
{
    $tmp = $path . '.tmp' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, $content, LOCK_EX) === false) {
        @unlink($tmp);
        return false;
    }
    if (!@rename($tmp, $path)) {
        // Windows: rename über bestehende Datei schlägt manchmal fehl
        $ok = @copy($tmp, $path);
        @unlink($tmp);
        return $ok;
    }
    return true;
}

function loadData(string $file): array
{
    $d = is_file($file) ? json_decode((string)file_get_contents($file), true) : null;
    return is_array($d) ? $d : [];
}

function backups(string $dir): array
{
    $files = glob($dir . '/content-*.json') ?: [];
    rsort($files);
    return $files;
}

/** Erkennt, ob die Seite über HTTPS läuft (auch hinter einem Proxy). */
function isHttps(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

/* ---------- Login-Bremse: 5 Fehlversuche -> 15 Minuten Sperre ---------- */

function throttleFile(string $dataDir): string
{
    return $dataDir . '/login-attempts.json';
}

function throttleState(string $dataDir): array
{
    $all = is_file(throttleFile($dataDir)) ? json_decode((string)file_get_contents(throttleFile($dataDir)), true) : [];
    $all = is_array($all) ? $all : [];
    $key = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|favolosa');
    $row = $all[$key] ?? ['n' => 0, 'until' => 0];
    return [$all, $key, $row];
}

function throttleLocked(string $dataDir): int
{
    [, , $row] = throttleState($dataDir);
    return max(0, (int)$row['until'] - time());
}

function throttleRecord(string $dataDir, bool $success): void
{
    [$all, $key, $row] = throttleState($dataDir);
    if ($success) {
        unset($all[$key]);
    } else {
        $row['n'] = ((int)$row['n']) + 1;
        if ($row['n'] >= 5) {
            $row = ['n' => 0, 'until' => time() + 15 * 60];
        }
        $all[$key] = $row;
    }
    // Alte Einträge aufräumen
    foreach ($all as $k => $r) {
        if ((int)$r['until'] < time() && (int)$r['n'] === 0) {
            unset($all[$k]);
        }
    }
    @file_put_contents(throttleFile($dataDir), json_encode($all), LOCK_EX);
}

/* ---------- Session ---------- */

session_name('favolosa_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/admin/index.php'), '/') . '/',
    'secure' => isHttps(),
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

if (!empty($_SESSION['auth']) && time() - (int)($_SESSION['last'] ?? 0) > $sessionSeconds) {
    $_SESSION = [];
}
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
$auth = !empty($_SESSION['auth']) && $hash !== '';
if ($auth) {
    $_SESSION['last'] = time();
}
$csrf = (string)$_SESSION['csrf'];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $method === 'POST' ? (string)($_POST['action'] ?? '') : '';
$isJson = $method === 'POST' && str_contains((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json');
$message = '';
$generatedHash = '';

/* ---------- JSON-Aktionen (speichern / rückgängig) ---------- */

if ($isJson) {
    if (!$auth) {
        jsonOut(['ok' => false, 'message' => 'Bitte neu einloggen.', 'login' => true], 401);
    }
    if (!hash_equals($csrf, (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
        jsonOut(['ok' => false, 'message' => 'Die Sitzung ist abgelaufen. Bitte Seite neu laden.'], 403);
    }
    $body = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($body)) {
        jsonOut(['ok' => false, 'message' => 'Ungültige Anfrage.'], 400);
    }
    if (!is_dir($backupDir)) {
        @mkdir($backupDir, 0755, true);
    }
    $current = loadData($dataFile);
    $reply = fn(string $msg) => [
        'ok' => true, 'message' => $msg, 'data' => loadData($dataFile),
        'canUndo' => count(backups($backupDir)) > 0,
    ];

    if (($body['action'] ?? '') === 'save') {
        $new = normalize(is_array($body['data'] ?? null) ? $body['data'] : [], $current);

        // Backup des bisherigen Stands, danach schreiben
        if ($current) {
            @file_put_contents($backupDir . '/content-' . date('Ymd-His') . '.json', json_encode($current, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        }
        $okJson = writeAtomic($dataFile, json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n");
        $okJs = $okJson && writeAtomic($jsFile, renderJs($new));
        if (!$okJson || !$okJs) {
            if ($current) {
                writeAtomic($dataFile, json_encode($current, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n");
            }
            jsonOut(['ok' => false, 'message' => 'Speichern nicht möglich: Dateien sind nicht beschreibbar. Bitte den Webdesigner informieren.'], 500);
        }
        foreach (array_slice(backups($backupDir), MAX_BACKUPS) as $old) {
            @unlink($old);
        }
        jsonOut($reply('Gespeichert. Die Änderungen sind jetzt auf der Website sichtbar.'));
    }

    if (($body['action'] ?? '') === 'undo') {
        $list = backups($backupDir);
        if (!$list) {
            jsonOut(['ok' => false, 'message' => 'Es gibt keine frühere Version.'], 404);
        }
        $prev = json_decode((string)file_get_contents($list[0]), true);
        if (!is_array($prev)) {
            jsonOut(['ok' => false, 'message' => 'Die frühere Version ist beschädigt.'], 500);
        }
        if (!writeAtomic($dataFile, json_encode($prev, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n")
            || !writeAtomic($jsFile, renderJs($prev))) {
            jsonOut(['ok' => false, 'message' => 'Zurücksetzen nicht möglich: Dateien sind nicht beschreibbar.'], 500);
        }
        @unlink($list[0]);
        jsonOut($reply('Die letzte Änderung wurde rückgängig gemacht.'));
    }

    jsonOut(['ok' => false, 'message' => 'Unbekannte Aktion.'], 400);
}

/* ---------- Formular-Aktionen (Login, Logout, Hash erzeugen) ---------- */

if ($method === 'POST') {
    if (!hash_equals($csrf, (string)($_POST['csrf'] ?? ''))) {
        $message = 'Die Sitzung ist abgelaufen. Bitte nochmals versuchen.';
    } elseif ($action === 'login' && $hash !== '') {
        $wait = throttleLocked($dataDir);
        if ($wait > 0) {
            $message = 'Zu viele Versuche. Bitte in ' . (int)ceil($wait / 60) . ' Minuten nochmals versuchen.';
        } elseif (password_verify((string)($_POST['password'] ?? ''), $hash)) {
            throttleRecord($dataDir, true);
            session_regenerate_id(true);
            $_SESSION['auth'] = true;
            $_SESSION['last'] = time();
            $_SESSION['csrf'] = bin2hex(random_bytes(16));
            header('Location: ./');
            exit;
        } else {
            throttleRecord($dataDir, false);
            usleep(600000);
            $message = 'Das Passwort stimmt nicht.';
        }
    } elseif ($action === 'logout') {
        $_SESSION = [];
        session_destroy();
        header('Location: ./');
        exit;
    } elseif ($action === 'makehash' && $hash === '') {
        $pw = (string)($_POST['password'] ?? '');
        if (mb_strlen($pw) < 10) {
            $message = 'Das Passwort braucht mindestens 10 Zeichen.';
        } else {
            $generatedHash = password_hash($pw, PASSWORD_DEFAULT);
        }
    }
}

/* ---------- Seite ---------- */

$writable = is_writable($jsFile) && (is_dir($dataDir) && is_writable($dataDir)) && is_writable($dataFile);
$data = $auth ? loadData($dataFile) : [];
$initial = [
    'data' => [
        'hinweis' => $data['hinweis'] ?? ['aktiv' => false, 'text' => '', 'bis' => ''],
        'sorten' => $data['sorten'] ?? ['milch' => [], 'sorbet' => []],
        'jobs' => $data['jobs'] ?? ['saison' => '', 'stellen' => []],
        'ausnahmen' => $data['ausnahmen'] ?? [],
    ],
    'lokale' => LOKALE,
    'canUndo' => $auth && is_dir($backupDir) && count(backups($backupDir)) > 0,
    'today' => today(),
];
?><!doctype html>
<html lang="de-CH">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="csrf" content="<?= e($csrf) ?>" />
  <title>Inhalte bearbeiten – La Favolosa</title>
  <link rel="icon" type="image/png" href="../assets/img/apple-touch-icon.png" />
  <link rel="stylesheet" href="../assets/fonts/fonts.css" />
  <link rel="stylesheet" href="admin.css" />
</head>
<body>
<?php if (!$auth): ?>
  <main class="login">
    <img src="../assets/img/logo.png" alt="La Favolosa" width="200" height="115" />
    <?php if ($hash === ''): ?>
      <h1>Admin einrichten</h1>
      <p>Es ist noch kein Passwort festgelegt. Wähle ein Passwort (mind. 10 Zeichen). Du bekommst einen Code, den du in <code>config.php</code> bei <code>admin → password_hash</code> einträgst. Hier wird nichts gespeichert.</p>
      <?php if ($generatedHash !== ''): ?>
        <p class="ok">Fertig. Diesen Code in <code>config.php</code> einsetzen:</p>
        <textarea readonly rows="3" class="hash"><?= e($generatedHash) ?></textarea>
      <?php else: ?>
        <?php if ($message): ?><p class="error" role="alert"><?= e($message) ?></p><?php endif; ?>
        <form method="post" autocomplete="off">
          <input type="hidden" name="csrf" value="<?= e($csrf) ?>" />
          <input type="hidden" name="action" value="makehash" />
          <label>Neues Passwort<input type="password" name="password" minlength="10" required autocomplete="new-password" /></label>
          <button type="submit" class="btn">Code erzeugen</button>
        </form>
      <?php endif; ?>
    <?php else: ?>
      <h1>Inhalte bearbeiten</h1>
      <p>Bitte melde dich an, um Sorten, Hinweise und Jobs der Website zu ändern.</p>
      <?php if ($message): ?><p class="error" role="alert"><?= e($message) ?></p><?php endif; ?>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>" />
        <input type="hidden" name="action" value="login" />
        <label>Passwort<input type="password" name="password" required autofocus autocomplete="current-password" /></label>
        <button type="submit" class="btn">Anmelden</button>
      </form>
    <?php endif; ?>
  </main>
<?php else: ?>
  <header class="top">
    <img src="../assets/img/logo.png" alt="La Favolosa" width="120" height="69" />
    <div class="top__actions">
      <a class="btn btn--ghost" href="../" target="_blank" rel="noopener">Website ansehen ↗</a>
      <button type="button" class="btn btn--ghost" id="undo" <?= $initial['canUndo'] ? '' : 'disabled' ?>>Letzte Änderung rückgängig</button>
      <form method="post" class="inline">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>" />
        <input type="hidden" name="action" value="logout" />
        <button type="submit" class="btn btn--ghost">Abmelden</button>
      </form>
    </div>
  </header>

  <main class="editor">
    <h1>Inhalte der Website</h1>
    <?php if (!$writable): ?>
      <p class="error" role="alert">Achtung: Die Dateien <code>content.js</code> und <code>data/</code> sind nicht beschreibbar. Speichern funktioniert erst, wenn der Webdesigner die Schreibrechte setzt.</p>
    <?php endif; ?>
    <noscript><p class="error">Für diese Seite wird JavaScript benötigt.</p></noscript>

    <section class="card" id="sec-banner">
      <h2>Hinweis-Banner</h2>
      <p class="hint">Der Streifen ganz oben auf der Website, z.B. «Heute wegen Regen ab 16:00 geschlossen».</p>
      <label class="switch"><input type="checkbox" id="banner-aktiv" /> <span>Banner anzeigen</span></label>
      <label class="field">Text <small id="banner-count"></small>
        <input type="text" id="banner-text" maxlength="160" placeholder="z.B. Heute wegen Regen alle Lokale ab 16:00 geschlossen." />
      </label>
      <label class="field">Anzeigen bis (letzter Tag)
        <input type="date" id="banner-bis" />
      </label>
    </section>

    <section class="card" id="sec-sorten">
      <h2>Sorten</h2>
      <p class="hint">Diese Sorten erscheinen auf der Startseite. Namen kannst du direkt anklicken und ändern. Mit ↑ ↓ ordnest du um, mit × löschst du.</p>
      <h3>Milchsorten</h3>
      <div class="chips" id="list-milch"></div>
      <h3>Sorbets</h3>
      <div class="chips" id="list-sorbet"></div>
    </section>

    <section class="card" id="sec-ausnahmen">
      <h2>Ausnahmetage</h2>
      <p class="hint">Feiertage, Wetter oder Privatanlass: An diesen Tagen gilt statt der normalen Öffnungszeit, was du hier einträgst. Vergangene Tage werden beim Speichern automatisch entfernt.</p>
      <div id="list-ausnahmen"></div>
      <button type="button" class="btn btn--ghost" id="add-ausnahme">+ Ausnahmetag hinzufügen</button>
    </section>

    <section class="card" id="sec-jobs">
      <h2>Offene Stellen</h2>
      <p class="hint">Ist die Liste leer, steht auf der Website «Aktuell keine offenen Stellen – Spontanbewerbungen sind willkommen».</p>
      <label class="field">Saison (z.B. 2027)
        <input type="text" id="jobs-saison" maxlength="20" />
      </label>
      <h3>Stellen</h3>
      <div class="chips" id="list-stellen"></div>
    </section>
  </main>

  <footer class="bar">
    <p class="status" id="status" role="status" aria-live="polite"></p>
    <button type="button" class="btn" id="save">Speichern</button>
  </footer>

  <script type="application/json" id="initial"><?= json_encode($initial, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
  <script src="admin.js"></script>
<?php endif; ?>
</body>
</html>
