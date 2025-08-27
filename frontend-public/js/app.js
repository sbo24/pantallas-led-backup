// Au début de app.js, avant la classe
console.log('🔍 CONFIG loaded:', CONFIG);
console.log('🔍 SHOW_STATES loaded:', SHOW_STATES);

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
            currentTime: document.getElementById('current-time'),
            showsTbody: document.getElementById('shows-tbody'),
            showsContainer: document.getElementById('shows-container'),
            alertMode: document.getElementById('alert-mode'),
            alertMessage: document.getElementById('alert-message'),
            alertTimestamp: document.getElementById('alert-timestamp'),
            lastUpdateTime: document.getElementById('last-update-time'),
            nextUpdateTime: document.getElementById('next-update-time')
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
            this.elements.currentTime.textContent = timeString;
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    startUpdateCycle() {
        this.updateTimer = setInterval(() => {
            this.fetchAndRender();
        }, CONFIG.UPDATE_INTERVAL);

        // start the next update timer
        this.startNextUpdateCountdown();
    }

    startNextUpdateCountdown() {
        let secondsLeft = CONFIG.UPDATE_INTERVAL / 1000;

        const updateCountdown = () => {
            this.elements.nextUpdateTime.textContent = `${secondsLeft}s`;
            secondsLeft--;

            if (secondsLeft < 0) {
                secondsLeft = CONFIG.UPDATE_INTERVAL / 1000;
            }
        };

        updateCountdown();
        this.nextUpdateTimer = setInterval(updateCountdown, 1000);
    }

    async fetchAndRender() {
        try {
            console.log('🔄 Fetching new data...');

            const response = await fetch(`${CONFIG.API_URL}/api/public/schedules?include_tomorrow=false`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            // verify the structure of data
            if(!this.validateData(data)) {
                throw new Error('Invalid data structure');
            }

            // Update validated data
            this.currentData = data;
            this.lastValidData = data;
            this.retryCount = 0;
            this.isOnline = true;

            this.render(data);

            console.log('✅ Données mises à jour avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de la récupération:', error);
            this.handleError(error);
        }
    }

    validateData(data) {
        return data && 
            typeof data === 'object' &&
            Array.isArray(data.shows) &&
            data.current_time &&
            data.display_mode;
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
        // update timestamp
        const localTime = new Date();
        this.elements.lastUpdateTime.textContent = localTime.toLocaleTimeString('es-ES', CONFIG.TIME_FORMAT);

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
      
        const sortKey = (show) => {
          const tNext = parseTimeToDate(show?.next_pass?.start_time);
          const tCurr = parseTimeToDate(show?.current_pass?.start_time);
          const candidate = tNext || tCurr; // on préfère un futur
          if (!candidate) return { past: 1, delta: Number.POSITIVE_INFINITY };
          const deltaMs = candidate - now;
          return { past: deltaMs < 0 ? 1 : 0, delta: Math.abs(deltaMs) };
        };
      
        const sorted = [...shows].sort((a, b) => {
          const ka = sortKey(a), kb = sortKey(b);
          if (ka.past !== kb.past) return ka.past - kb.past;      // futurs d’abord
          if (ka.delta !== kb.delta) return ka.delta - kb.delta;  // plus proche ensuite
          const na = (a.show_name || a.name || ''), nb = (b.show_name || b.name || '');
          return na.localeCompare(nb);
        });
      
        const displayShows = sorted.slice(0, CONFIG.MAX_SHOWS_DISPLAYED);
      
        const rows = displayShows.map((show, index) => {
          const showName = show.show_name || show.name || 'Show desconocido';
          const startTime = show.current_pass?.start_time || '--:--';      // HORA = passe en cours uniquement
          const status = show.current_pass?.status || show.status || 'PROGRAMADO';
          const nextShow = show.next_pass?.start_time || show.next_show || '---';
      
          const state = SHOW_STATES[status] || SHOW_STATES.PROGRAMADO;
      
          return `
            <tr data-show-id="${show.show_id || show.id}" data-status="${status}">
              <td class="show-number">${index + 1}</td>
              <td class="show-name">${this.escapeHtml(showName)}</td>
              <td class="show-time">${startTime}</td>
              <td class="show-status">
                <span class="show-status ${state.class}">
                  ${state.icon} ${state.label}
                </span>
              </td>
              <td class="show-next">${nextShow}</td>
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
                <td colspan="5" style="text-align: center; padding: 4rem;">
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
        if (this.nextUpdateTimer) {
            clearInterval(this.nextUpdateTimer);
        }
        console.log('🛑 ShowsTrack Client arrêté');
    }
}

// Automatic start when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const client = new ShowsTrackClient();
    client.start();

    // clean up
    window.addEventListener('beforeunload', () => {
        client.destroy();
    });
});
