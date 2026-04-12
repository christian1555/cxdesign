document.addEventListener('DOMContentLoaded', function () {
    var burger = document.querySelector('.burger');
    var menu = document.querySelector('.navbar-menu');
    var mainContent = document.getElementById('main-content');
    var subpages = document.querySelectorAll('.subpage');

    function showMain() {
        mainContent.style.display = '';
        for (var i = 0; i < subpages.length; i++) subpages[i].classList.remove('active');
        document.body.classList.remove('subpage-mode');
    }

    function showSubpage(id) {
        mainContent.style.display = 'none';
        for (var i = 0; i < subpages.length; i++) subpages[i].classList.remove('active');
        var target = document.getElementById(id);
        if (target) target.classList.add('active');
        document.body.classList.add('subpage-mode');
        window.scrollTo(0, 0);
    }

    // Nav links: scroll to section on main page
    var navLinks = document.querySelectorAll('.navbar-menu .nav-link[data-page]');
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', function (e) {
            e.preventDefault();
            showMain();
            var target = document.getElementById(this.dataset.page);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
            menu.classList.remove('open');
        });
    }

    // Logo: back to top
    document.querySelector('.navbar-logo').addEventListener('click', function (e) {
        e.preventDefault();
        showMain();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        menu.classList.remove('open');
    });

    // Project cards: show subpage
    var projectLinks = document.querySelectorAll('.project-card.nav-link');
    for (var i = 0; i < projectLinks.length; i++) {
        projectLinks[i].addEventListener('click', function (e) {
            e.preventDefault();
            showSubpage(this.dataset.page);
        });
    }

    // Photo: scroll to om-mig
    var photoLinks = document.querySelectorAll('.navbar-photo-container.nav-link');
    for (var i = 0; i < photoLinks.length; i++) {
        photoLinks[i].addEventListener('click', function (e) {
            e.preventDefault();
            showMain();
            var target = document.getElementById('om-mig');
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Back buttons in subpages
    var backBtns = document.querySelectorAll('.back-btn');
    for (var i = 0; i < backBtns.length; i++) {
        backBtns[i].addEventListener('click', function () {
            showMain();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    burger.addEventListener('click', function () { menu.classList.toggle('open'); });

    // Lightbox for subpage images
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightbox-img');

    var subpageImages = document.querySelectorAll('.subpage-right img');
    for (var i = 0; i < subpageImages.length; i++) {
        subpageImages[i].addEventListener('click', function () {
            lightboxImg.src = this.src;
            lightboxImg.alt = this.alt;
            lightbox.classList.add('active');
        });
    }

    lightbox.addEventListener('click', function () {
        lightbox.classList.remove('active');
        lightboxImg.src = '';
    });

    // Custom resize handle
    var handle = document.querySelector('.resize-handle');
    var textarea = document.querySelector('.form-message');
    handle.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var startY = e.clientY;
        var startH = textarea.offsetHeight;
        function onMove(e) { textarea.style.height = Math.max(100, startH + e.clientY - startY) + 'px'; }
        function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    // Contact form
    var form = document.getElementById('contact-form');
    var status = document.getElementById('form-status');
    var lastSubmit = 0;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (Date.now() - lastSubmit < 10000) {
            status.textContent = 'Vent venligst før du sender igen.';
            status.className = 'form-status show error';
            return;
        }
        if (document.getElementById('honeypot').value !== '') return;

        var btn = document.querySelector('.send-btn');
        btn.disabled = true;
        btn.textContent = 'Sender...';

        fetch('https://formspree.io/f/YOUR_FORM_ID', { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                status.textContent = data.success ? 'Besked sendt!' : (data.message || 'Noget gik galt.');
                status.className = 'form-status show ' + (data.success ? 'success' : 'error');
                if (data.success) { form.reset(); lastSubmit = Date.now(); }
                btn.disabled = false;
                btn.textContent = 'Send';
                setTimeout(function () { status.className = 'form-status'; }, 4000);
            })
            .catch(function () {
                status.textContent = 'Noget gik galt. Prøv igen.';
                status.className = 'form-status show error';
                btn.disabled = false;
                btn.textContent = 'Send';
                setTimeout(function () { status.className = 'form-status'; }, 4000);
            });
    });
});
