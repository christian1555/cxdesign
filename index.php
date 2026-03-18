<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CC Design</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <?php include 'includes/navbar.php'; ?>

    <!-- Main content (one-pager) -->
    <div id="main-content">

        <!-- Projekter -->
        <section id="projekter" class="section">
            <h1 class="page-title">Projekter</h1>
            <p class="page-subtitle">Hold over et projekt for at læse mere, eller klik på et billede for at se hele projektet.</p>
            <div class="projects-grid">
                <a href="#truetab" class="project-card nav-link" data-page="truetab">
                    <img src="img/projects/truetab.png" alt="TrueTab">
                    <div class="project-overlay"><span class="project-name">TrueTab</span></div>
                </a>
                <a href="#norrild-consult" class="project-card nav-link" data-page="norrild-consult">
                    <img src="img/projects/norrild-consult.png" alt="Norrild Consult">
                    <div class="project-overlay"><span class="project-name">Norrild Consult</span></div>
                </a>
                <a href="#lions-nyk-f" class="project-card nav-link" data-page="lions-nyk-f">
                    <img src="img/projects/Lions.png" alt="Lions Nyk F.">
                    <div class="project-overlay"><span class="project-name">Lions Nyk F.</span></div>
                </a>
                <a href="#sport-ocean-design" class="project-card nav-link" data-page="sport-ocean-design">
                    <img src="img/projects/sport-ocean.png" alt="Sport Ocean">
                    <div class="project-overlay"><span class="project-name">Sport Ocean</span></div>
                </a>
                <a href="#lokalitee" class="project-card nav-link" data-page="lokalitee">
                    <img src="img/projects/Lokalitee.png" alt="LokaliTee">
                    <div class="project-overlay"><span class="project-name">LokaliTee</span></div>
                </a>
                <a href="#videoredigering" class="project-card nav-link" data-page="videoredigering">
                    <img src="img/projects/videoredigering.jpg" alt="Videoredigering">
                    <div class="project-overlay"><span class="project-name">Videoredigering</span></div>
                </a>
            </div>
        </section>

        <!-- Kontakt -->
        <section id="kontakt" class="section">
            <h1 class="page-title">Kontakt</h1>
            <p class="page-subtitle">Du kan enten sende mig en direkte besked med nedenstående formular, eller benytte kontaktoplysningerne.</p>
            <div class="kontakt-wrapper">
                <div class="kontakt-form-container">
                    <form id="contact-form">
                        <input type="text" name="honeypot" id="honeypot" style="display:none;" tabindex="-1" autocomplete="off">
                        <div class="form-top-row">
                            <input type="text" name="titel" placeholder="Titel (Valgfrit)" class="form-field">
                            <input type="text" name="kontakt" placeholder="Email / Kontaktinfo (Valgfrit)" class="form-field">
                        </div>
                        <textarea name="besked" placeholder="Skriv din besked her..." class="form-field form-message" required></textarea>
                        <div class="resize-handle"></div>
                    </form>
                    <div class="form-bottom">
                        <button type="submit" form="contact-form" class="send-btn">Send</button>
                        <span id="form-status" class="form-status"></span>
                    </div>
                </div>
                <div class="kontakt-info">
                    <h2 class="kontakt-info-title">Kontaktoplysninger</h2>
                    <p><strong>Email:</strong> &nbsp;&nbsp;&nbsp;&nbsp;christiandesign544@gmail.com</p>
                    <p><strong>Tlf. Nr.:</strong> &nbsp;&nbsp;26 37 85 20</p>
                    <br>
                    <p>Bor i Nykøbing F. - Vestergade 8.</p>
                </div>
            </div>
        </section>

        <!-- Om mig -->
        <section id="om-mig" class="section">
            <h1 class="page-title">Om mig</h1>
            <p class="page-subtitle">Kommer snart.</p>
        </section>

    </div>

    <!-- Project subpages (hidden, shown on click) -->
    <section id="truetab" class="subpage">
        <h1 class="page-title">TrueTab</h1>
        <p class="page-subtitle">Projektbeskrivelse kommer snart.</p>
    </section>
    <section id="norrild-consult" class="subpage">
        <h1 class="page-title">Norrild Consult</h1>
        <p class="page-subtitle">Projektbeskrivelse kommer snart.</p>
    </section>
    <section id="lions-nyk-f" class="subpage">
        <h1 class="page-title">Lions Nyk F.</h1>
        <p class="page-subtitle">Projektbeskrivelse kommer snart.</p>
    </section>
    <section id="sport-ocean-design" class="subpage">
        <h1 class="page-title">Sport Ocean</h1>
        <p class="page-subtitle">Projektbeskrivelse kommer snart.</p>
    </section>
    <section id="lokalitee" class="subpage">
        <h1 class="page-title">LokaliTee</h1>
        <p class="page-subtitle">Projektbeskrivelse kommer snart.</p>
    </section>
    <section id="videoredigering" class="subpage">
        <h1 class="page-title">Videoredigering</h1>
        <p class="page-subtitle">Projektbeskrivelse kommer snart.</p>
    </section>

    <script src="js/main.js"></script>
</body>
</html>
