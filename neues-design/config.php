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
];
