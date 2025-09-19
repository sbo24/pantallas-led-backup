// Au début de app.js, avant la classe
console.log('🔍 CONFIG loaded:', CONFIG);
console.log('🔍 SHOW_STATES loaded:', SHOW_STATES);

// DETECCIÓN MODO DEMO via URL parameter (?demo=true)
const urlParams = new URLSearchParams(window.location.search);
const DEMO_MODE = urlParams.get('demo') === 'true';

if (DEMO_MODE) {
    console.log('📺 DEMO MODE: Activated via URL parameter (?demo=true)');
} else {
    console.log('🔄 NORMAL MODE: Using real API data');
}

// DATOS DEMO - Se cargan desde archivo JSON centralizado
let DEMO_DATA = null;

// Función para cargar datos demo desde JSON centralizado
async function loadDemoData() {
    try {
        const response = await fetch('./data/demo-data.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        DEMO_DATA = await response.json();
        console.log('📺 DEMO DATA: Cargados desde JSON centralizado:', DEMO_DATA);
    } catch (error) {
        console.error('❌ Error cargando datos demo centralizados:', error);
        // Fallback: datos mínimos en caso de error
        DEMO_DATA = {
            display_mode: "normal",
            current_time: null,
            shows: []
        };
    }
}

// Principal client for Pantallas LED
class ShowsTrackClient {
    constructor() {
        this.currentData = null;
        this.lastValidData = null;
        this.retryCount = 0;
        this.updateTimer = null;
        this.nextUpdateTimer = null;
        this.isOnline = true;

        // DOM elements
        this.elements = {
            clockHeader: document.getElementById('clock-header'),
            showsTbody: document.getElementById('shows-tbody'),
            showsContainer: document.getElementById('shows-container'),
            alertMode: document.getElementById('alert-mode'),
            alertMessage: document.getElementById('alert-message'),
            alertTimestamp: document.getElementById('alert-timestamp'),
            customMessageText: document.getElementById('custom-message-text')
        };
    }

    async start() {
        console.log('🚀 ShowsTrack Client démarré');

        // Start the clock
        this.startClock();

        // Loading initial
        await this.fetchAndRender();

        // Set up an automatic update cycle
        this.startUpdateCycle();
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('es-ES', CONFIG.TIME_FORMAT);
            this.elements.clockHeader.textContent = timeString;
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    startUpdateCycle() {
        this.updateTimer = setInterval(() => {
            this.fetchAndRender();
        }, CONFIG.UPDATE_INTERVAL);
    }

    async fetchAndRender() {
        // MODO DEMO MANUAL - Solo si URL contiene ?demo=true
        if (DEMO_MODE) {
            // Cargar datos demo desde JSON centralizado si no están cargados
            if (!DEMO_DATA) {
                await loadDemoData();
            }
            console.log('📺 DEMO MODE: Using centralized demo data');
            this.currentData = DEMO_DATA;
            this.lastValidData = DEMO_DATA;
            this.render(DEMO_DATA);
            return;
        }

        try {
            console.log('🔄 Obteniendo nuevos datos de la API...');
            console.log('📡 URL de conexión:', `${CONFIG.API_URL}/api/public/schedules?include_tomorrow=false`);

            const response = await fetch(`${CONFIG.API_URL}/api/public/schedules?include_tomorrow=false`);
            console.log('📡 Respuesta recibida, estado:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('📦 Datos recibidos:', data);
            
            // Verificar la estructura de los datos
            if(!this.validateData(data)) {
                console.error('❌ Estructura de datos inválida');
                throw new Error('Estructura de datos inválida');
            }

            // Actualizar datos validados
            this.currentData = data;
            this.lastValidData = data;
            this.retryCount = 0;
            this.isOnline = true;

            this.render(data);

            console.log('✅ Datos reales actualizados exitosamente');
            console.log('🎭 Total de shows encontrados:', data.shows?.length || 0);
        } catch (error) {
            console.error('❌ Error obteniendo datos reales:', error);
            this.handleError(error);
        }
    }

    validateData(data) {
        return data && 
            typeof data === 'object' &&
            Array.isArray(data.shows) &&
            data.current_time &&
            data.display_mode &&
            data.metadata;
    }

    handleError(error) {
        this.isOnline = false;
        this.retryCount++;
        
        console.warn(`🔄 Tentative ${this.retryCount}/${CONFIG.MAX_RETRIES}`);
        
        // if we have valid previous data, keep it
        if (this.lastValidData) {
            this.renderWithWarning(this.lastValidData);
        }
        
        // Schedule a new attempt with exponential backoff
        if (this.retryCount <= CONFIG.MAX_RETRIES) {
            const delay = CONFIG.RETRY_DELAYS[this.retryCount - 1] || CONFIG.RETRY_DELAYS[CONFIG.RETRY_DELAYS.length - 1];
            console.log(`⏰ Nouvelle tentative dans ${delay/1000}s`);
            
            setTimeout(() => {
                this.fetchAndRender();
            }, delay);
        } else {
            console.error('💥 Nombre maximum de tentatives atteint');
            this.renderOfflineMode();
        }
    }

    render(data) {
        // Update custom message if present in metadata
        if (data.metadata && data.metadata.custom_message) {
            this.elements.customMessageText.textContent = data.metadata.custom_message;
        }

        // Verify the display mode
        if(data.display_mode === 'alert' && data.alert) {
            this.renderAlert(data.alert);
        } else if (data.shows.length === 0) {
            this.renderNoShows();
        } else {
            this.renderShows(data.shows);
        }
    }

    renderShows(shows) {
        // Afficher la zone "shows"
        this.elements.alertMode.style.display = 'none';
        this.elements.showsContainer.style.display = 'block';
      
        const now = new Date();
        const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
        const parseTimeToDate = (timeStr) => {
          if (!timeStr || typeof timeStr !== 'string') return null;
          const [h, m] = timeStr.split(':').map(x => parseInt(x, 10));
          if (Number.isNaN(h) || Number.isNaN(m)) return null;
          const d = new Date(baseDate);
          d.setHours(h, m, 0, 0);
          return d;
        };

        const getStatusRank = (show) => {
            const status = show?.current_pass?.status || show?.status || 'PROGRAMADO';
            // Priority: ABIERTO (0) > CERRADO (1) > PROGRAMADO (2) > CANCELADO (3)
            switch (status) {
                case 'ABIERTO': return 0;
                case 'CERRADO': return 1;
                case 'PROGRAMADO': return 2;
                case 'CANCELADO': return 3;
                default: return 4;
            }
        };
      
        const sortKey = (show) => {
          const tCurr = parseTimeToDate(show?.current_pass?.start_time);
          // CORREGIDO: Solo usar current_pass para ordenación (consistente con backend)
          const candidate = tCurr;
          const rank = getStatusRank(show);
          if (!candidate) return { rank, past: 1, delta: Number.POSITIVE_INFINITY };
          const deltaMs = candidate - now;
          return { rank, past: deltaMs < 0 ? 1 : 0, delta: Math.abs(deltaMs) };
        };
      
        const sorted = [...shows].sort((a, b) => {
            const ka = sortKey(a), kb = sortKey(b);
            if (ka.rank !== kb.rank) return ka.rank - kb.rank;
            if (ka.past !== kb.past) return ka.past - kb.past;
            if (ka.delta !== kb.delta) return ka.delta - kb.delta;
            const na = (a.show_name || a.name || ''), nb = (b.show_name || b.name || '');
            return na.localeCompare(nb);
          });
      
        const displayShows = sorted.slice(0, CONFIG.MAX_SHOWS_DISPLAYED);
      
        const rows = displayShows.map((show, index) => {
          const showName = show.show_name || show.name || 'Show desconocido';
          const startTime = show.current_pass?.start_time || '--:--';      // HORA = passe en cours uniquement
          const status = show.current_pass?.status || show.status || 'PROGRAMADO';
          const nextShow = show.next_pass?.start_time || show.next_show || '---';
      
          return `
            <tr data-show-id="${show.show_id || show.id}" data-status="${status}">
              <td class="col-show-combined" colspan="2">
                <div class="show-content">
                  ${show.selected_icon_filename ? 
                    `<img src="./assets/images/show-icons/${show.selected_icon_filename}" class="show-icon" alt="${showName}">` 
                    : `<span class="show-number">${index + 1}</span>`
                  }
                  <span class="show-name">${this.escapeHtml(showName)}</span>
                </div>
              </td>
              <td class="col-time">
                <span class="show-time">${startTime}</span>
              </td>
              <td class="col-status">
                <span class="show-status" data-status="${status}">
                  ${status}
                </span>
              </td>
              <td class="col-next">
                <span class="show-next">${nextShow}</span>
              </td>
            </tr>
          `;
        }).join('');
      
        this.updateTableWithAnimation(rows);
      }

    renderAlert(alert) {
        // Mask show container
        this.elements.showsContainer.style.display = 'none';

        // Show alert mode
        this.elements.alertMode.style.display = 'flex';
        this.elements.alertMessage.textContent = alert.message;
        
        const alertTime = new Date(alert.activated_at);
        this.elements.alertTimestamp.textContent = 
            `Activada: ${alertTime.toLocaleTimeString('es-ES', CONFIG.TIME_FORMAT)}`;
    }

    renderNoShows() {
        // Masquer le mode alerte
        this.elements.alertMode.style.display = 'none';
        this.elements.showsContainer.style.display = 'block';
        
        // Afficher message "pas de shows"
        this.elements.showsTbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 4rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎭</div>
                    <div style="font-size: 2rem; font-weight: 600; margin-bottom: 1rem;">
                        No hay espectáculos programados en este momento
                    </div>
                    <div style="font-size: 1.5rem; color: var(--color-text-secondary);">
                        Consulte el programa del día en recepción
                    </div>
                </td>
            </tr>
        `;
    }

    renderWithWarning(data) {
        this.render(data);
        // TODO: Ajouter indicateur de données non actualisées
        console.warn('⚠️ Affichage des dernières données valides');
    }

    renderOfflineMode() {
        if (this.lastValidData) {
            this.renderWithWarning(this.lastValidData);
        } else {
            this.renderNoShows();
        }
        // TODO: Ajouter indicateur hors ligne
        console.error('📵 Mode hors ligne activé');
    }

    updateTableWithAnimation(newHTML) {
        // Animation simple de mise à jour
        this.elements.showsTbody.style.opacity = '0.7';
        
        setTimeout(() => {
            this.elements.showsTbody.innerHTML = newHTML;
            this.elements.showsTbody.style.opacity = '1';
        }, CONFIG.ANIMATION_DURATION / 2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // clean when closure
    destroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        console.log('🛑 ShowsTrack Client arrêté');
    }
}

// Automatic start when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const client = new ShowsTrackClient();
    client.start();

    // COMUNICACIÓN CON VISTA DE OPERADOR
    // Escuchar mensajes desde la Vista de Operador para refresh forzado
    window.addEventListener('message', (event) => {
        // Verificar origen por seguridad (solo localhost en desarrollo)
        if (event.origin !== 'http://localhost:3000' && event.origin !== window.location.origin) {
            return;
        }
        
        // Manejar diferentes tipos de mensajes
        switch (event.data?.type) {
            case 'OPERATOR_REFRESH':
                console.log('🔄 Operator triggered refresh - updating display immediately');
                client.fetchAndRender();
                break;
            case 'OPERATOR_PING':
                // Responder que estamos listos para comunicación
                event.source?.postMessage({
                    type: 'FRONTEND_PUBLIC_READY',
                    timestamp: new Date().toISOString()
                }, event.origin);
                break;
        }
    });

    // Notificar que estamos listos (si estamos en un iframe)
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'FRONTEND_PUBLIC_READY',
            timestamp: new Date().toISOString()
        }, '*');
    }

    // clean up
    window.addEventListener('beforeunload', () => {
        client.destroy();
    });
});
