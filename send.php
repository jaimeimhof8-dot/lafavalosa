<?php
/* =========================================================
   La Favolosa – Formularversand
   Empfängt das Formular aus index.html und verschickt es per E-Mail.
   - Antwortet mit JSON (fetch) oder leitet weiter (ohne JavaScript)
   - Spam-Schutz: Honeypot, Mindestzeit, Limit pro IP
   - Keine Speicherung der Inhalte auf dem Server
   ========================================================= */

declare(strict_types=1);
date_default_timezone_set('Europe/Zurich');

$config = require __DIR__ . '/config.php';
$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, string $message, int $code = 200): never
{
    global $wantsJson;
    http_response_code($code);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    } elseif ($ok) {
        header('Location: danke.html', true, 303);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        $msg = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        echo "<!doctype html><html lang=\"de-CH\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
           . "<meta name=\"robots\" content=\"noindex\"><title>Fehler – La Favolosa</title>"
           . "<link rel=\"stylesheet\" href=\"assets/fonts/fonts.css\"><link rel=\"stylesheet\" href=\"assets/css/styles.css\">"
           . "<body class=\"page\"><main class=\"container center-page\"><div><h1>Ups.</h1><p>{$msg}</p>"
           . "<a class=\"btn btn--dark\" href=\"javascript:history.back()\">Zurück zum Formular</a></div></main></body></html>";
    }
    exit;
}

/** Text aus dem Formular holen: getrimmt, ohne Steuerzeichen, auf Länge begrenzt. */
function field(string $name, int $max = 200, bool $multiline = false): string
{
    $v = trim((string)($_POST[$name] ?? ''));
    $v = $multiline
        ? preg_replace('/[^\P{C}\n\t]/u', '', str_replace("\r\n", "\n", $v))
        : preg_replace('/\p{C}/u', ' ', $v);
    return mb_substr((string)$v, 0, $max);
}

/** Werte für E-Mail-Header: Zeilenumbrüche entfernen (Header-Injection) */
function headerSafe(string $v): string
{
    return trim(str_replace(["\r", "\n", '%0a', '%0d'], '', $v));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'Ungültige Anfrage.', 405);
}

/* ---------- Spam-Schutz ---------- */
// 1) Honeypot ausgefüllt → so tun, als ob alles geklappt hätte
if (field('website') !== '') {
    respond(true, 'Danke!');
}
// 2) Zu schnell abgeschickt (nur prüfbar, wenn JavaScript aktiv war)
$t = field('t', 10);
if ($t !== '' && (int)$t < (int)$config['min_seconds']) {
    respond(false, 'Das ging etwas schnell. Bitte versuche es nochmals.', 429);
}
// 3) Limit pro IP und Stunde (nur ein gehashter IP-Wert wird kurz zwischengespeichert)
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('Y-m-d-H'));
$rateFile = sys_get_temp_dir() . '/favolosa_rate_' . $ipHash;
$count = is_file($rateFile) ? (int)file_get_contents($rateFile) : 0;
if ($count >= (int)$config['max_per_hour']) {
    respond(false, 'Zu viele Anfragen. Bitte versuche es später nochmals oder ruf uns an: 078 882 25 27.', 429);
}

/* ---------- Validierung ---------- */
$topics = ['kontakt' => 'Frage / Kontakt', 'event' => 'Event & Coolbox', 'gutschein' => 'Gutschein-Bestellung', 'bewerbung' => 'Bewerbung'];
$topic = field('topic', 20);
if (!isset($topics[$topic])) $topic = 'kontakt';

$vorname  = field('vorname', 80);
$nachname = field('nachname', 80);
$email    = field('email', 120);
$telefon  = field('telefon', 40);
$nachricht = field('nachricht', 3000, true);

$errors = [];
if ($vorname === '' || $nachname === '') $errors[] = 'Bitte Vor- und Nachname angeben.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Bitte eine gültige E-Mail-Adresse angeben.';
if (($_POST['datenschutz'] ?? '') !== 'ja') $errors[] = 'Bitte die Datenschutzerklärung bestätigen.';
if ($topic === 'kontakt' && $nachricht === '') $errors[] = 'Bitte eine Nachricht schreiben.';
if ($topic === 'event' && field('event_datum', 10) === '') $errors[] = 'Bitte das Datum des Anlasses angeben.';
if ($topic === 'gutschein' && !in_array(field('gs_betrag', 5), ['20', '30', '50', '100'], true)) $errors[] = 'Bitte einen Gutschein-Betrag wählen.';
if ($errors) respond(false, implode(' ', $errors), 422);

/* ---------- Mailtext ---------- */
$lines = [
    'Anliegen'  => $topics[$topic],
    'Name'      => "$vorname $nachname",
    'E-Mail'    => $email,
    'Telefon'   => $telefon ?: '–',
];
if ($topic === 'event') {
    $lines += [
        'Datum'     => field('event_datum', 10),
        'Gäste'     => field('event_gaeste', 6) ?: '–',
        'Anlass'    => field('event_art', 40),
        'Angebot'   => field('event_angebot', 60),
        'Ort'       => field('event_ort', 120) ?: '–',
    ];
} elseif ($topic === 'gutschein') {
    $lines += [
        'Betrag'    => 'CHF ' . field('gs_betrag', 5),
        'Anzahl'    => field('gs_anzahl', 3) ?: '1',
        'Zustellung' => field('gs_zustellung', 60),
        'Adresse'   => field('gs_adresse', 300, true) ?: '–',
        'Widmung'   => field('gs_widmung', 160) ?: '–',
    ];
} elseif ($topic === 'bewerbung') {
    $lines += [
        'Bereich'   => field('job_bereich', 80),
        'Pensum'    => field('job_pensum', 40),
    ];
}

$body = '';
foreach ($lines as $k => $v) $body .= str_pad($k . ':', 12) . $v . "\n";
if ($nachricht !== '') $body .= "\nNachricht:\n" . $nachricht . "\n";
$body .= "\n—\nGesendet über das Formular auf favolosa.ch am " . date('d.m.Y \u\m H:i') . " Uhr.\n";

/* ---------- Anhang (nur Bewerbung) ---------- */
$attachment = null;
if ($topic === 'bewerbung' && isset($_FILES['job_cv']) && $_FILES['job_cv']['error'] !== UPLOAD_ERR_NO_FILE) {
    $f = $_FILES['job_cv'];
    $maxBytes = (int)$config['max_upload_mb'] * 1024 * 1024;
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > $maxBytes) {
        respond(false, 'Die Datei konnte nicht hochgeladen werden (max. ' . $config['max_upload_mb'] . ' MB).', 422);
    }
    // Dateityp anhand des Inhalts prüfen, nicht anhand des Namens
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $allowed = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'];
    if (!isset($allowed[$mime])) {
        respond(false, 'Bitte den Lebenslauf als PDF, JPG oder PNG senden.', 422);
    }
    $safeName = preg_replace('/[^A-Za-z0-9_-]/', '', "Lebenslauf_{$vorname}_{$nachname}") . '.' . $allowed[$mime];
    $attachment = ['name' => $safeName, 'mime' => $mime, 'data' => file_get_contents($f['tmp_name'])];
}

/* ---------- Versand ---------- */
$to = ($topic === 'bewerbung' && $config['to_jobs'] !== '') ? $config['to_jobs'] : $config['to'];
$subject = '=?UTF-8?B?' . base64_encode("Website: {$topics[$topic]} von $vorname $nachname") . '?=';
$fromName = '=?UTF-8?B?' . base64_encode($config['from_name']) . '?=';

$headers = [
    'From' => "$fromName <" . headerSafe($config['from']) . '>',
    'Reply-To' => headerSafe($email),
    'MIME-Version' => '1.0',
    'X-Mailer' => 'favolosa-website',
];

if ($attachment) {
    $boundary = 'fav_' . bin2hex(random_bytes(12));
    $headers['Content-Type'] = "multipart/mixed; boundary=\"$boundary\"";
    $message = "--$boundary\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($body)) . "\r\n"
        . "--$boundary\r\n"
        . "Content-Type: {$attachment['mime']}; name=\"{$attachment['name']}\"\r\n"
        . "Content-Transfer-Encoding: base64\r\n"
        . "Content-Disposition: attachment; filename=\"{$attachment['name']}\"\r\n\r\n"
        . chunk_split(base64_encode($attachment['data'])) . "\r\n"
        . "--$boundary--\r\n";
} else {
    $headers['Content-Type'] = 'text/plain; charset=UTF-8';
    $headers['Content-Transfer-Encoding'] = 'base64';
    $message = chunk_split(base64_encode($body));
}

// Testmodus: Mail in eine Datei schreiben statt senden (nur über Umgebungsvariable aktivierbar)
$logFile = getenv('FAVOLOSA_MAIL_LOG');
if (!$logFile && (str_contains($to, 'BITTE-ERSETZEN') || !filter_var($to, FILTER_VALIDATE_EMAIL))) {
    respond(false, 'Das Formular ist noch nicht eingerichtet. Bitte ruf uns an: 078 882 25 27.', 503);
}
if ($logFile) {
    $raw = "To: $to\nSubject: $subject\n";
    foreach ($headers as $k => $v) $raw .= "$k: $v\n";
    $sent = file_put_contents($logFile, $raw . "\n" . $message . "\n=====\n", FILE_APPEND) !== false;
} else {
    $sent = mail($to, $subject, $message, $headers, '-f' . headerSafe($config['from']));
}

if (!$sent) {
    respond(false, 'Die Nachricht konnte nicht gesendet werden. Bitte ruf uns an: 078 882 25 27.', 500);
}

file_put_contents($rateFile, (string)($count + 1));
respond(true, 'Danke! Deine Nachricht ist bei uns angekommen. Wir melden uns bald.');
