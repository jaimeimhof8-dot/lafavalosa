<?php
/* =========================================================
   Einstellungen für das Kontaktformular (send.php)
   VOR GO-LIVE ANPASSEN – siehe GO-LIVE.md
   ========================================================= */

return [
    // Empfänger der Formular-Nachrichten
    'to' => 'BITTE-ERSETZEN@favolosa.ch',

    // Absender – muss eine Adresse der eigenen Domain sein (sonst landet die Mail im Spam)
    'from' => 'website@favolosa.ch',
    'from_name' => 'Website La Favolosa',

    // Optional: Bewerbungen an eine andere Adresse senden (leer = gleiche wie 'to')
    'to_jobs' => '',

    // Spam-Schutz
    'min_seconds' => 3,      // so lange muss das Formular mindestens offen gewesen sein
    'max_per_hour' => 5,     // maximale Anfragen pro IP-Adresse und Stunde

    // Anhänge (nur Bewerbung)
    'max_upload_mb' => 5,

    // Admin-Bereich /admin/ (Inhalte bearbeiten) – siehe GO-LIVE.md
    'admin' => [
        // Passwort-Hash. Erzeugen: /admin/ aufrufen, solange das Feld leer ist, und den Code hier einsetzen.
        'password_hash' => '',
        // Automatisch abmelden nach so vielen Minuten Inaktivität
        'session_minutes' => 60,
    ],

    // Google-Daten (Öffnungszeiten & Bewertungen) – siehe google.php und GO-LIVE.md
    'google' => [
        // Places-API-Schlüssel (Google Cloud Console, "Places API (New)" aktivieren,
        // Schlüssel auf die Server-IP und "Places API (New)" beschränken)
        'api_key' => 'BITTE-ERSETZEN',

        // So viele Stunden werden die Google-Daten zwischengespeichert
        'cache_hours' => 6,

        // Lokale. place_id leer lassen: wird per Suchtext automatisch gefunden.
        'places' => [
            'baelliz'     => ['place_id' => '', 'query' => 'Gelateria La Favolosa Bälliz 60 3600 Thun'],
            'muehleplatz' => ['place_id' => '', 'query' => 'Gelateria Creperie Bar La Favolosa Mühleplatz 34 3600 Thun'],
            'gwatt'       => ['place_id' => '', 'query' => 'La Favolosa Gwattstrasse 68 3645 Gwatt'],
            'bahnhof'     => ['place_id' => '', 'query' => 'Gelateria La Favolosa SBB Seestrasse 2 3600 Thun'],
            'muensingen'  => ['place_id' => '', 'query' => 'Gelateria La Favolosa Münsingen Neue Bahnhofstrasse 2'],
        ],
    ],
];
