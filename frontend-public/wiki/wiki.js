/**
 * Wiki ShowsTrack - Funcionalidad de Navegación
 */

// Navegación activa en el sidebar
document.addEventListener('DOMContentLoaded', () => {
    // Elementos
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');

    // Función para actualizar el link activo
    function updateActiveLink() {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (window.pageYOffset >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');

            if (href === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    // Event listener para scroll
    window.addEventListener('scroll', updateActiveLink);

    // Event listener para clicks en navegación
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 20,
                    behavior: 'smooth'
                });

                // Actualizar link activo inmediatamente
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                // Actualizar URL sin recargar
                history.pushState(null, null, `#${targetId}`);
            }
        });
    });

    // Cargar sección desde URL al inicio
    const hash = window.location.hash;
    if (hash) {
        const targetLink = document.querySelector(`.nav-link[href="${hash}"]`);
        if (targetLink) {
            targetLink.click();
        }
    } else {
        // Por defecto, marcar el primer link como activo
        if (navLinks.length > 0) {
            navLinks[0].classList.add('active');
        }
    }

    // Actualizar al cargar
    updateActiveLink();
});

// Funcionalidad de búsqueda (opcional - para implementación futura)
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        if (searchTerm.length < 3) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
            return;
        }

        // Buscar en todas las secciones
        const sections = document.querySelectorAll('.content-section');
        const results = [];

        sections.forEach(section => {
            const title = section.querySelector('h1')?.textContent || '';
            const content = section.textContent.toLowerCase();

            if (content.includes(searchTerm)) {
                results.push({
                    title: title,
                    id: section.id,
                    preview: getPreview(section, searchTerm)
                });
            }
        });

        displaySearchResults(results);
    });
}

function getPreview(section, searchTerm) {
    const content = section.textContent;
    const index = content.toLowerCase().indexOf(searchTerm);
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + 50);

    return '...' + content.substring(start, end) + '...';
}

function displaySearchResults(results) {
    const searchResults = document.getElementById('search-results');

    if (results.length === 0) {
        searchResults.innerHTML = '<p>No se encontraron resultados</p>';
    } else {
        searchResults.innerHTML = results.map(result => `
            <div class="search-result" onclick="navigateToSection('${result.id}')">
                <h4>${result.title}</h4>
                <p>${result.preview}</p>
            </div>
        `).join('');
    }

    searchResults.style.display = 'block';
}

function navigateToSection(sectionId) {
    const link = document.querySelector(`.nav-link[href="#${sectionId}"]`);
    if (link) {
        link.click();
    }

    // Cerrar resultados de búsqueda
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
}

// Botón de volver arriba (scroll to top)
window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollTopButton = document.getElementById('scroll-top-btn');

    if (scrollTopButton) {
        if (scrollTop > 300) {
            scrollTopButton.style.display = 'block';
        } else {
            scrollTopButton.style.display = 'none';
        }
    }
});

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Mobile menu toggle (para vista móvil)
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

// Copiar código al portapapeles (si hay bloques de código)
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Mostrar notificación de éxito
        showNotification('Copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar:', err);
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Animaciones CSS para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Expandir/colapsar secciones (acordeón)
document.addEventListener('DOMContentLoaded', () => {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isOpen = content.style.display === 'block';

            content.style.display = isOpen ? 'none' : 'block';
            header.classList.toggle('open');
        });
    });
});

// Imprimir página
function printPage() {
    window.print();
}

// Compartir enlace
function shareLink(sectionId) {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;

    if (navigator.share) {
        navigator.share({
            title: 'Wiki ShowsTrack',
            url: url
        }).catch(err => console.log('Error al compartir:', err));
    } else {
        copyToClipboard(url);
        showNotification('Enlace copiado al portapapeles');
    }
}

// Modo oscuro (toggle)
let darkMode = localStorage.getItem('darkMode') === 'true';

function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);

    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Aplicar modo oscuro al cargar
document.addEventListener('DOMContentLoaded', () => {
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
});

// Resaltar términos de búsqueda en la página
function highlightSearchTerm(term) {
    const sections = document.querySelectorAll('.content-section');

    sections.forEach(section => {
        const content = section.innerHTML;
        const regex = new RegExp(`(${term})`, 'gi');
        section.innerHTML = content.replace(regex, '<mark>$1</mark>');
    });
}

// Limpiar resaltado
function clearHighlight() {
    const marks = document.querySelectorAll('mark');
    marks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
    });
}

// Exportar a PDF (usando window.print)
function exportToPDF() {
    window.print();
}

// Generar tabla de contenidos dinámica
function generateTableOfContents() {
    const toc = document.getElementById('table-of-contents');
    if (!toc) return;

    const sections = document.querySelectorAll('.content-section');
    let tocHTML = '<ul class="toc-list">';

    sections.forEach(section => {
        const title = section.querySelector('h1')?.textContent || '';
        const id = section.id;

        if (title && id) {
            tocHTML += `<li><a href="#${id}">${title}</a></li>`;
        }
    });

    tocHTML += '</ul>';
    toc.innerHTML = tocHTML;
}

// Inicializar todo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Wiki ShowsTrack cargada correctamente');

    // Generar tabla de contenidos si existe el contenedor
    generateTableOfContents();
});

// Soporte para teclado (navegación con flechas)
document.addEventListener('keydown', (e) => {
    const activeLink = document.querySelector('.nav-link.active');

    if (!activeLink) return;

    let nextLink;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextLink = activeLink.nextElementSibling;
        while (nextLink && !nextLink.classList.contains('nav-link')) {
            nextLink = nextLink.nextElementSibling;
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextLink = activeLink.previousElementSibling;
        while (nextLink && !nextLink.classList.contains('nav-link')) {
            nextLink = nextLink.previousElementSibling;
        }
    }

    if (nextLink && nextLink.classList.contains('nav-link')) {
        nextLink.click();
    }
});
