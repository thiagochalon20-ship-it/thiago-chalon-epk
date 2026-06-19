document.addEventListener("DOMContentLoaded", function() {
    // 1. ANIMACIONES DE SCROLL Y CASCADA (STAGGER)
    const fadeInSections = document.querySelectorAll('.fade-in-section');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    fadeInSections.forEach(section => {
        observer.observe(section);
    });

    // 2. CURSOR MAGNÉTICO PERSONALIZADO
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    const interactables = document.querySelectorAll('a, button, .interactive');

    // Mover el cursor con requestAnimationFrame para máxima fluidez
    let mouseX = 0;
    let mouseY = 0;
    let outlineX = 0;
    let outlineY = 0;

    window.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Usar transform en lugar de left/top evita layout thrashing y usa la GPU (Mejora masiva de FPS)
        cursorDot.style.transform = `translate3d(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%), 0)`;
    });

    function animateCursor() {
        // Easing para que el círculo exterior siga al ratón con un leve retraso orgánico
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;

        cursorOutline.style.transform = `translate3d(calc(${outlineX}px - 50%), calc(${outlineY}px - 50%), 0)`;

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Efecto magnético (agrandar el cursor) al pasar sobre elementos clickeables
    interactables.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorOutline.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            cursorOutline.classList.remove('hover');
        });
    });
});
