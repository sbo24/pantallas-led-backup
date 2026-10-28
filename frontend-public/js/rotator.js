/**
 * Rotator de Pantallas LED - Puy du Fou España
 * Alterna entre el iframe de horarios y las imágenes de eventos programados
 */

class DisplayRotator {
    constructor() {
        this.config = null;
        this.currentIndex = -1; // -1 = no inicializado
        this.playlist = [];
        this.rotationTimer = null;
        this.configPollTimer = null;

        this.elements = {
            scheduleFrame: document.getElementById('schedule-frame'),
            slideLayer: document.getElementById('slide-layer'),
            slideImage: document.getElementById('slide-image')
        };
    }

    async init() {
        console.log('🎬 Inicializando Rotator de Pantallas LED...');
        
        // 1. Cargar configuración inicial
        await this.loadConfig();

        // 2. Iniciar la rotación
        this.startNextItem();

        // 3. Consultar periódicamente cambios de configuración en background
        this.configPollTimer = setInterval(() => {
            this.loadConfig();
        }, 20000); // Cada 20 segundos
    }

    async loadConfig() {
        try {
            // Intentar cargar desde el backend API
            const apiBase = window.CONFIG?.API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/public/slides-config`, {
                cache: 'no-store'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.config = data.data;
                    console.log('✅ Configuración de diapositivas sincronizada:', this.config);
                    return;
                }
            }
        } catch (error) {
            console.warn('⚠️ No se pudo conectar al endpoint API de diapositivas, usando fallback local:', error);
        }

        // Si ya teníamos config en memoria, mantenerla
        if (this.config) return;

        // Configuración por defecto si no hay conexión
        this.config = {
            enabled: true,
            schedule_slide: {
                title: "Horarios de Espectáculos",
                duration_seconds: 30,
                enabled: true
            },
            slides: [
                {
                    id: "sueno_2000",
                    title: "El Sueño de Toledo - 20:00H",
                    image_url: "./assets/images/slides/sueno-toledo-2000.jpg",
                    duration_seconds: 15,
                    enabled: true,
                    all_day: false,
                    start_time: "10:00",
                    end_time: "20:00"
                },
                {
                    id: "sueno_2230",
                    title: "El Sueño de Toledo - 22:30H",
                    image_url: "./assets/images/slides/sueno-toledo-2230.jpg",
                    duration_seconds: 15,
                    enabled: true,
                    all_day: false,
                    start_time: "18:00",
                    end_time: "22:30"
                },
                {
                    id: "musica_directo",
                    title: "Música en Directo",
                    image_url: "./assets/images/slides/musica-en-directo.jpg",
                    duration_seconds: 15,
                    enabled: true,
                    all_day: true,
                    start_time: "10:00",
                    end_time: "23:00"
                }
            ]
        };
    }

    isSlideActiveNow(slide) {
        if (!slide.enabled) return false;

        const now = new Date();

        // 1. Verificación de días específicos de la semana o fechas
        const daysMode = slide.days_mode || 'all';

        if (daysMode === 'weekdays') {
            const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
            const activeDays = Array.isArray(slide.active_days) ? slide.active_days : [0, 1, 2, 3, 4, 5, 6];
            if (!activeDays.includes(dayOfWeek)) {
                return false;
            }
        } else if (daysMode === 'dates') {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            if (slide.start_date && todayStr < slide.start_date) return false;
            if (slide.end_date && todayStr > slide.end_date) return false;
        }

        // 2. Verificación de horario durante el día
        if (slide.all_day) return true;
        if (!slide.start_time || !slide.end_time) return true;

        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;

        return currentTimeStr >= slide.start_time && currentTimeStr <= slide.end_time;
    }

    buildPlaylist() {
        if (!this.config || !this.config.enabled) {
            // Si la rotación está desactivada, solo mostrar horario
            return [{ type: 'schedule', duration: 30 }];
        }

        const list = [];

        // 1. Si existe lista ordenada unificada 'items'
        if (Array.isArray(this.config.items) && this.config.items.length > 0) {
            for (const item of this.config.items) {
                if (item.type === 'schedule') {
                    if (item.enabled !== false) {
                        list.push({
                            type: 'schedule',
                            title: item.title || 'Horarios',
                            duration: Math.max(5, item.duration_seconds || 30)
                        });
                    }
                } else {
                    if (this.isSlideActiveNow(item)) {
                        list.push({
                            type: 'image',
                            id: item.id,
                            title: item.title,
                            image_url: item.image_url,
                            duration: Math.max(5, item.duration_seconds || 15)
                        });
                    }
                }
            }
        } else {
            // Fallback a estructura legacy { schedule_slide, slides }
            if (this.config.schedule_slide?.enabled !== false) {
                list.push({
                    type: 'schedule',
                    title: this.config.schedule_slide?.title || 'Horarios',
                    duration: Math.max(5, this.config.schedule_slide?.duration_seconds || 30)
                });
            }

            if (Array.isArray(this.config.slides)) {
                for (const slide of this.config.slides) {
                    if (this.isSlideActiveNow(slide)) {
                        list.push({
                            type: 'image',
                            id: slide.id,
                            title: slide.title,
                            image_url: slide.image_url,
                            duration: Math.max(5, slide.duration_seconds || 15)
                        });
                    }
                }
            }
        }

        // Si la lista quedó vacía, fallback a horario
        if (list.length === 0) {
            list.push({ type: 'schedule', duration: 30 });
        }

        return list;
    }

    startNextItem() {
        clearTimeout(this.rotationTimer);

        this.playlist = this.buildPlaylist();
        
        // Avanzar índice
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        const currentItem = this.playlist[this.currentIndex];

        console.log(`⏱️ Mostrando [${this.currentIndex + 1}/${this.playlist.length}]:`, currentItem);

        if (currentItem.type === 'schedule') {
            this.showSchedule();
        } else {
            this.showImageSlide(currentItem);
        }

        // Programar el siguiente cambio
        const durationMs = currentItem.duration * 1000;
        this.rotationTimer = setTimeout(() => {
            this.startNextItem();
        }, durationMs);
    }

    showSchedule() {
        // Desvanecer capa de imagen y mostrar iframe
        if (this.elements.slideLayer) {
            this.elements.slideLayer.style.opacity = '0';
            this.elements.slideLayer.style.pointerEvents = 'none';
        }
        if (this.elements.scheduleFrame) {
            this.elements.scheduleFrame.style.opacity = '1';
        }
    }

    showImageSlide(slideItem) {
        if (!this.elements.slideImage || !this.elements.slideLayer) return;

        // Precargar imagen para transición suave sin parpadeo
        const img = new Image();
        img.onload = () => {
            this.elements.slideImage.src = slideItem.image_url;
            this.elements.slideLayer.style.opacity = '1';
            this.elements.slideLayer.style.pointerEvents = 'auto';

            if (this.elements.scheduleFrame) {
                this.elements.scheduleFrame.style.opacity = '0';
            }
        };
        img.onerror = () => {
            console.error('❌ Error cargando imagen de diapositiva:', slideItem.image_url);
            // Si la imagen falla, volver de inmediato a los horarios
            this.showSchedule();
        };
        img.src = slideItem.image_url;
    }
}

// Iniciar al cargar la ventana
window.addEventListener('DOMContentLoaded', () => {
    const rotator = new DisplayRotator();
    rotator.init();
});
