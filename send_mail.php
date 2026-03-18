<?php
header('Content-Type: application/json');

// Rate limiting via session
session_start();
$now = time();
if (isset($_SESSION['last_mail']) && ($now - $_SESSION['last_mail']) < 10) {
    echo json_encode(['success' => false, 'message' => 'Vent venligst før du sender igen.']);
    exit;
}

// Honeypot check
if (!empty($_POST['honeypot'])) {
    echo json_encode(['success' => true]);
    exit;
}

// Validate message
$besked = trim($_POST['besked'] ?? '');
if (empty($besked)) {
    echo json_encode(['success' => false, 'message' => 'Skriv venligst en besked.']);
    exit;
}

$titel = trim($_POST['titel'] ?? 'Ingen titel');
$kontakt = trim($_POST['kontakt'] ?? 'Ikke oplyst');

$to = 'christiandesign544@gmail.com';
$subject = 'CC Design kontaktformular: ' . $titel;

$body = "Ny besked fra kontaktformularen:\n\n";
$body .= "Titel: $titel\n";
$body .= "Kontaktinfo: $kontakt\n\n";
$body .= "Besked:\n$besked\n";

$headers = "From: noreply@ccdesign.dk\r\n";
$headers .= "Reply-To: " . ($kontakt !== 'Ikke oplyst' ? $kontakt : 'noreply@ccdesign.dk') . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = mail($to, $subject, $body, $headers);

$_SESSION['last_mail'] = $now;

if ($sent) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Kunne ikke sende beskeden. Prøv igen senere.']);
}
