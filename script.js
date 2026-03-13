/**
 * Novogrudok Landing Page - Jonite-style clone
 * Lenis + GSAP ScrollTrigger + Hero load timeline
 */

document.addEventListener('DOMContentLoaded', () => {
    initGSAP(); // Must run first to register ScrollTrigger
    initLenis();
    initHeroSlides();
    initHeroBoxSlides();
    initTouristsVideo();
    initLazyImages();
    initTimeDisplay();
    initHeader();
    initBackToTop();
    initMobileMenu();
    initFooterProjectsCarousel();
    initPhotoModal();
});

window.addEventListener('load', () => {
    initHeroLoadAnimation(); // Run after load, like Jonite
});

/**
 * Lenis Smooth Scroll + GSAP integration
 */
function initLenis() {
    if (typeof Lenis === 'undefined') {
        initSmoothScrollFallback();
        return;
    }

    window.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 2
    });

    document.documentElement.classList.add('lenis');

    const lenis = window.lenis;

    if (typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);
    }

    if (typeof gsap !== 'undefined') {
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
        setTimeout(() => ScrollTrigger?.refresh(), 100);
    } else {
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            if (document.body.classList.contains('menu-open')) {
                return;
            }

            e.preventDefault();
            lenis.scrollTo(target, { offset: 0 });
        });
    });
}

function initSmoothScrollFallback() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * GSAP ScrollTrigger - Reveal animations, Parallax, 3D effects
 */
function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Reveal animations
    gsap.utils.toArray('[data-reveal]').forEach((el, i) => {
        gsap.fromTo(el, 
            { opacity: 0, y: 60 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.8, 
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    end: 'bottom 15%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    // Hero background — статичное фото без анимации

    // Product card images - parallax on scroll
    gsap.utils.toArray('[data-parallax-img]').forEach(card => {
        const img = card.querySelector('[data-depth]');
        if (!img) return;
        const depth = parseFloat(img.dataset.depth) || 0.3;

        gsap.to(img, {
            yPercent: 30 * depth,
            ease: 'none',
            scrollTrigger: {
                trigger: card,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1
            }
        });
    });

    // Case cards - 3D tilt on scroll
    gsap.utils.toArray('.case-card').forEach((card, i) => {
        const img = card.querySelector('.case-card__image');
        if (!img) return;

        gsap.fromTo(img, 
            { scale: 1.1 },
            { 
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 90%',
                    end: 'bottom 10%',
                    scrub: 1
                }
            }
        );
    });

    // Sample cards - scale parallax
    gsap.utils.toArray('.sample-card').forEach((card, i) => {
        gsap.fromTo(card,
            { scale: 1.15 },
            {
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 90%',
                    end: 'bottom 10%',
                    scrub: 1
                }
            }
        );
    });
}

/**
 * Hero load animation - Jonite-style clip-path reveal + h1 slide
 */
function initHeroLoadAnimation() {
    if (typeof gsap === 'undefined') return;

    const hero = document.querySelector('[data-hero]');
    if (!hero) return;

    const h1 = hero.querySelector('[data-hero-h1]');
    const leftBox = hero.querySelector('[data-hero-leftbox]');
    const rightBox = hero.querySelector('[data-hero-rightbox]');

    if (!h1 || !leftBox || !rightBox) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
        h1.style.transform = 'translateY(0)';
        leftBox.style.setProperty('--height', '100%');
        rightBox.style.setProperty('--height', '100%');
        return;
    }

    h1.style.transform = 'translateY(100%)';

    const timeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onStart: () => {
            try { window.lenis?.stop(); } catch (_) {}
        },
        onComplete: () => {
            try { window.lenis?.start(); } catch (_) {}
        }
    });

    const isDesktop = window.matchMedia('(min-width: 992px)').matches;
    const leftBoxHeight = leftBox.getBoundingClientRect().height;
    const rightBoxHeight = rightBox.getBoundingClientRect().height;

    timeline.addLabel('step1', 0.5);
    timeline.to(leftBox, { '--height': '198px', duration: 0.7 }, 'step1');
    timeline.to(rightBox, { '--height': '198px', duration: 0.7 }, 'step1');
    timeline.addLabel('step2', '+=0.2');
    timeline.to(leftBox, { '--height': leftBoxHeight + 'px', duration: 1.2 }, 'step2');
    timeline.to(rightBox, { '--height': rightBoxHeight + 'px', duration: 1.2 }, 'step2');
    timeline.to(h1, { y: 0, duration: 1.2 }, 'step2');
}

/**
 * Hero background slideshow
 */
function initHeroSlides() {
    const slides = document.querySelectorAll('.hero__bg .hero__slide');
    if (slides.length < 2) return;

    let current = 0;
    const duration = 6000;

    function nextSlide() {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }

    setInterval(nextSlide, duration);
}

/**
 * Hero right box slideshow
 */
function initHeroBoxSlides() {
    const container = document.querySelector('.hero__box-slides');
    if (!container) return;

    const slides = container.querySelectorAll('.hero__box-slide');
    if (slides.length < 2) return;

    let current = 0;
    const duration = 8000;

    function nextSlide() {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }

    setInterval(nextSlide, duration);
}

/**
 * Tourists section video:
 * - vertical preview (muted)
 * - lazy load on view
 * - modal with sound + controls
 */
function initTouristsVideo() {
    const section = document.getElementById('tourists');
    if (!section || !('IntersectionObserver' in window)) return;

    const video = section.querySelector('.tourists__video');
    const playBtn = section.querySelector('.tourists__play');
    const shell = section.querySelector('.tourists__video-shell');

    const modal = document.getElementById('touristsVideoModal');
    const modalVideo = document.getElementById('touristsVideoModalPlayer');
    const modalClose = document.getElementById('touristsVideoClose');
    const modalBackdrop = document.getElementById('touristsVideoBackdrop');

    if (!video) return;

    let hasLoaded = false;
    let inView = false;

    // IntersectionObserver для прелоада и автопаузы превью
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.target !== section) return;
            inView = entry.isIntersecting;

            if (entry.isIntersecting) {
                if (!hasLoaded) {
                    const src = video.getAttribute('data-src');
                    if (src) {
                        video.src = src;
                        hasLoaded = true;
                    }
                }
                video.muted = true;
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, {
        threshold: 0.5
    });

    observer.observe(section);

    function openVideoModal() {
        if (!modal || !modalVideo) return;

        // Убедиться, что src загружен
        if (!hasLoaded) {
            const src = video.getAttribute('data-src');
            if (src) {
                video.src = src;
                hasLoaded = true;
            }
        }

        const src = video.currentSrc || video.getAttribute('data-src');
        if (!src) return;

        modalVideo.src = src;
        modalVideo.currentTime = video.currentTime || 0;
        modalVideo.muted = false;

        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        video.pause();

        modalVideo.play().catch(() => {});
    }

    function closeVideoModal() {
        if (!modal || !modalVideo) return;

        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        modalVideo.pause();

        // Возвращаемся к превью (без звука), только если секция видна
        if (inView) {
            video.muted = true;
            video.play().catch(() => {});
        }
    }

    if (playBtn) {
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openVideoModal();
        });
    }

    if (shell) {
        shell.addEventListener('click', (e) => {
            // клики по кнопке уже обработаны выше
            if (e.target.closest('.tourists__play')) return;
            openVideoModal();
        });
    }

    if (modalClose) modalClose.addEventListener('click', closeVideoModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeVideoModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
            closeVideoModal();
        }
    });
}

/**
 * Facts section video:
 * - vertical preview (muted)
 * - lazy load on view
 * - opens shared modal with sound + controls
 */
/**
 * Live time display - Novogrudok & Grodno (like Jonite US/Singapore)
 */
function initTimeDisplay() {
    const timeEl = document.getElementById('heroTime');
    const timeEl2 = document.getElementById('heroTime2');
    if (!timeEl) return;

    const formatter1 = new Intl.DateTimeFormat('ru-BY', {
        timeZone: 'Europe/Minsk',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const formatter2 = new Intl.DateTimeFormat('ru-BY', {
        timeZone: 'Europe/Minsk',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    function updateTime() {
        const now = new Date();
        const p1 = formatter1.formatToParts(now);
        const hour = p1.find(x => x.type === 'hour')?.value || '00';
        const minute = p1.find(x => x.type === 'minute')?.value || '00';
        const second = p1.find(x => x.type === 'second')?.value || '00';
        const str = `${hour} : ${minute} : ${second}`;
        timeEl.textContent = str;
        if (timeEl2) timeEl2.textContent = str;
    }

    updateTime();
    setInterval(updateTime, 1000);
}

/**
 * Header scroll effect
 */
function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
}

/**
 * Lazy-load images with loading=\"lazy\" only when section is in view
 */
function initLazyImages() {
    if (!('IntersectionObserver' in window)) return;

    const lazyImages = Array.from(document.querySelectorAll('img[loading=\"lazy\"]'));
    if (!lazyImages.length) return;

    const bySection = new Map();
    lazyImages.forEach(img => {
        const section = img.closest('section') || document.body;
        if (!bySection.has(section)) bySection.set(section, []);
        bySection.get(section).push(img);
    });

    // Move src -> data-lazy-src so browser не грузит заранее
    bySection.forEach(imgs => {
        imgs.forEach(img => {
            const src = img.getAttribute('src');
            if (!src) return;
            img.setAttribute('data-lazy-src', src);
            img.removeAttribute('src');
        });
    });

    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const section = entry.target;
            const imgs = bySection.get(section);
            if (!imgs || !imgs.length) return;

            imgs.forEach(img => {
                const src = img.getAttribute('data-lazy-src');
                if (!src) return;
                img.setAttribute('src', src);
                img.removeAttribute('data-lazy-src');
            });

            bySection.delete(section);
            sectionObserver.unobserve(section);
        });
    }, {
        threshold: 0.2
    });

    bySection.forEach((_imgs, section) => {
        sectionObserver.observe(section);
    });
}

/**
 * Back to top button
 */
function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    const showOffset = 400;

    function onScroll() {
        if (window.scrollY > showOffset) {
            btn.classList.add('back-to-top--visible');
        } else {
            btn.classList.remove('back-to-top--visible');
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', () => {
        if (window.lenis) {
            window.lenis.scrollTo(0, { offset: 0 });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

/**
 * Mobile menu
 */
function initMobileMenu() {
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav');

    if (!burger || !nav) return;

    let savedScrollY = 0;

    if (!nav.id) {
        nav.id = 'mobile-nav';
    }

    burger.setAttribute('aria-controls', nav.id);
    burger.setAttribute('aria-expanded', 'false');
    nav.setAttribute('aria-hidden', 'true');

    function openMenu() {
        savedScrollY = window.scrollY || window.pageYOffset || 0;

        burger.classList.add('active');
        nav.classList.add('open');

        document.documentElement.classList.add('menu-open');
        document.body.classList.add('menu-open');
        document.body.style.top = `-${savedScrollY}px`;

        burger.setAttribute('aria-expanded', 'true');
        nav.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
        burger.classList.remove('active');
        nav.classList.remove('open');

        document.documentElement.classList.remove('menu-open');
        document.body.classList.remove('menu-open');
        document.body.style.top = '';

        burger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('aria-hidden', 'true');

        window.scrollTo(0, savedScrollY);
    }

    function toggleMenu() {
        if (nav.classList.contains('open')) {
            closeMenu();
            return;
        }

        openMenu();
    }

    burger.addEventListener('click', toggleMenu);

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (!href || href === '#') {
                closeMenu();
                return;
            }

            const target = document.querySelector(href);
            if (!target) {
                closeMenu();
                return;
            }

            e.preventDefault();
            closeMenu();

            requestAnimationFrame(() => {
                if (window.lenis) {
                    window.lenis.scrollTo(target, { offset: 0 });
                } else {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024 && nav.classList.contains('open')) {
            closeMenu();
        }
    });
}

/**
 * Footer projects carousel
 */
function initFooterProjectsCarousel() {
    const track = document.querySelector('.footer-projects__track');
    const prev = document.querySelector('.footer-projects__arrow--prev');
    const next = document.querySelector('.footer-projects__arrow--next');
    if (!track || !prev || !next) return;

    // Дублируем элементы, чтобы сделать бесконечную ленту
    const originalItems = Array.from(track.children);
    const copies = 3; // сколько раз продублировать набор
    track.innerHTML = '';
    for (let i = 0; i < copies; i++) {
        originalItems.forEach(item => {
            track.appendChild(item.cloneNode(true));
        });
    }

    const items = Array.from(track.children);
    let offset = 0;
    let itemWidth = 0;

    const recalc = () => {
        if (!items.length) return;
        itemWidth = items[0].getBoundingClientRect().width + 16;
    };

    recalc();
    window.addEventListener('resize', recalc);

    const totalWidth = () => itemWidth * items.length;
    const loopSpan = () => itemWidth * originalItems.length;

    const applyOffset = () => {
        // когда пролистали длину одного набора — возвращаемся в начало
        if (Math.abs(offset) >= loopSpan()) {
            offset += loopSpan() * Math.sign(offset);
        }
        track.style.transform = `translateX(${offset}px)`;
    };

    const stepBy = (delta) => {
        offset += delta;
        applyOffset();
    };

    // Автопрокрутка
    const speed = -0.4; // пикселей за кадр
    let rafId;
    const tick = () => {
        offset += speed;
        applyOffset();
        rafId = requestAnimationFrame(tick);
    };
    tick();

    // Стрелки смещают на ширину одного элемента
    prev.addEventListener('click', () => {
        stepBy(itemWidth);
    });

    next.addEventListener('click', () => {
        stepBy(-itemWidth);
    });
}

/**
 * Модальное окно просмотра фото (галерея лесенкой)
 */
function initPhotoModal() {
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('photoModalImg');
    const closeBtn = document.getElementById('photoModalClose');
    const backdrop = document.getElementById('photoModalBackdrop');
    const photos = document.querySelectorAll('.gallery-ladder__img, .photo-stack__img, .facts-photo img');

    if (!modal || !modalImg || !photos.length) return;

    function openModal(src, alt) {
        modalImg.src = src;
        modalImg.alt = alt || '';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    photos.forEach((img) => {
        img.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(img.src, img.alt);
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
            closeModal();
        }
    });
}
