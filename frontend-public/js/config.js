const CONFIG = {
    // API configuration
    API_URL: "http://localhost:8000",

    // Timing configuration
    UPDATE_INTERVAL: 30000,
    RETRY_DELAYS: [5000, 10000, 20000], // Backoff exponential
    MAX_RETRIES: 3,
    CACHE_DURATION: 120000,

    // UI Configuration
    ANIMATION_DURATION: 300, // ms
    MAX_SHOWS_DISPLAYED: 5,

    // Time configuration
    TIMEZONE: 'Europe/Madrid',
    TIME_FORMAT: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    },
    DATE_FORMAT: {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }
};

const SHOW_STATES = {
    PROGRAMADO: {
        class: 'status-programado',
        icon: '🕒',
        label: 'PROGRAMADO'
    },
    ABIERTO: {
        class: 'status-abierto',
        icon: '✅',
        label: 'ABIERTO'
    },
    CERRADO: {
        class: 'status-cerrado',
        icon: '❌',
        label: 'CERRADO'
    },
    CANCELADO: {
        class: 'status-cancelado',
        icon: '⚠️',
        label: 'CANCELADO'
    }
};

// export const
window.CONFIG = CONFIG;
window.SHOW_STATES = SHOW_STATES;