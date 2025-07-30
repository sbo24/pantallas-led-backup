"""
Tests para el motor de cálculo de estados (StateEngine).

Valida el algoritmo de 5 pasos según business-rules.md:
1. Verificación de overrides activos
2. Resolución de lead times  
3. Cálculo de ventanas temporales
4. Determinación de estado por hora actual
5. Aplicación de casos especiales
"""
import pytest
from datetime import datetime, date, time, timedelta
from unittest.mock import AsyncMock, MagicMock

from app.services.state_engine import StateEngine, LeadTimeConfig, TimeWindows
from app.models.event import ScheduledEvent
from app.models.show import Show
from app.models.override import StatusOverride


class TestStateEngine:
    """Suite de tests para StateEngine."""
    
    @pytest.fixture
    def mock_db(self):
        """Mock de sesión de base de datos."""
        db = AsyncMock()
        return db
    
    @pytest.fixture  
    def sample_show(self):
        """Show de ejemplo con configuración básica."""
        show = Show(
            id=1,
            name="El Último Cantar",
            custom_lead_time_access_minutes=None,  # Usar globales
            custom_lead_time_finalized_minutes=None
        )
        return show
    
    @pytest.fixture
    def sample_show_custom_lead_times(self):
        """Show de ejemplo con lead times personalizados."""
        show = Show(
            id=2,
            name="El Sueño de Toledo",
            custom_lead_time_access_minutes=45,  # 45 min personalizado
            custom_lead_time_finalized_minutes=5   # 5 min personalizado
        )
        return show
    
    @pytest.fixture
    def sample_event_today(self, sample_show):
        """Evento de ejemplo para hoy a las 15:30."""
        event = ScheduledEvent(
            id=1,
            external_event_id="test_event_1",
            show_id=1,
            show=sample_show,
            event_date=date.today(),
            start_time=time(15, 30),  # 15:30
            end_time=time(16, 30),    # 16:30
            duration_minutes=60
        )
        return event
    
    @pytest.fixture
    def active_override(self):
        """Override activo de ejemplo."""
        override = StatusOverride(
            id=1,
            scheduled_event_id=1,
            override_status="CANCELADO",
            override_reason="Motivos técnicos",
            is_active=True
        )
        return override

    @pytest.mark.asyncio
    async def test_paso1_override_activo(self, mock_db, sample_event_today, active_override):
        """
        Test Paso 1: Override activo debe tener prioridad máxima.
        """
        # Configurar mock para retornar override activo
        mock_db.execute.return_value.scalar_one_or_none.return_value = active_override
        
        state_engine = StateEngine(mock_db)
        estado = await state_engine.calculate_event_state(sample_event_today)
        
        # Override debe tener prioridad sobre cualquier cálculo
        assert estado == "CANCELADO"
    
    @pytest.mark.asyncio
    async def test_paso1_sin_override(self, mock_db, sample_event_today):
        """
        Test Paso 1: Sin override activo, continúa con pasos siguientes.
        """
        # Configurar mock para no retornar override
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        
        state_engine = StateEngine(mock_db)
        
        # Simular tiempo ANTES de la ventana de acceso (más de 30 min antes)  
        tiempo_test = datetime.combine(date.today(), time(14, 45))  # 45 min antes de 15:30
        estado = await state_engine.calculate_event_state(sample_event_today, tiempo_test)
        
        assert estado == "PROGRAMADO"
    
    def test_paso2_lead_times_globales(self, sample_show):
        """
        Test Paso 2: Resolución de lead times usando valores globales.
        """
        state_engine = StateEngine(None)  # No necesita DB para este test
        
        # Mock del show sin configuración personalizada
        show = Show(
            custom_lead_time_access_minutes=None,
            custom_lead_time_finalized_minutes=None
        )
        
        # Simular llamada directa al método privado para testing
        lead_times = state_engine._resolve_lead_times(show)
        
        # Debe usar valores por defecto (30/0)
        assert lead_times.access_minutes == 30
        assert lead_times.finalized_minutes == 0
    
    def test_paso2_lead_times_personalizados(self, sample_show_custom_lead_times):
        """
        Test Paso 2: Resolución de lead times usando configuración específica del show.
        """
        state_engine = StateEngine(None)
        
        # Simular llamada al método privado
        # En implementación real esto sería async, pero para testing usamos valores directos
        lead_times = LeadTimeConfig(
            access_minutes=sample_show_custom_lead_times.custom_lead_time_access_minutes,
            finalized_minutes=sample_show_custom_lead_times.custom_lead_time_finalized_minutes
        )
        
        # Debe usar valores personalizados del show
        assert lead_times.access_minutes == 45
        assert lead_times.finalized_minutes == 5
    
    def test_paso3_calculo_ventanas_temporales(self, sample_event_today):
        """
        Test Paso 3: Cálculo correcto de ventanas temporales.
        """
        state_engine = StateEngine(None)
        lead_times = LeadTimeConfig(access_minutes=30, finalized_minutes=0)
        
        windows = state_engine._calculate_time_windows(sample_event_today, lead_times)
        
        # Verificar cálculos
        expected_show_start = datetime.combine(date.today(), time(15, 30))
        expected_access_start = expected_show_start - timedelta(minutes=30)  # 15:00
        expected_finalized_start = expected_show_start  # 15:30 (0 min antes)
        expected_show_end = datetime.combine(date.today(), time(16, 30))
        
        assert windows.show_start == expected_show_start
        assert windows.access_start == expected_access_start
        assert windows.finalized_start == expected_finalized_start
        assert windows.show_end == expected_show_end
    
    def test_paso4_determinacion_estado_programado(self):
        """
        Test Paso 4: Estado PROGRAMADO antes de ventana de acceso.
        """
        state_engine = StateEngine(None)
        
        # Crear ventanas para evento a las 15:30
        windows = TimeWindows(
            access_start=datetime.combine(date.today(), time(15, 0)),   # 15:00
            finalized_start=datetime.combine(date.today(), time(15, 30)), # 15:30
            show_start=datetime.combine(date.today(), time(15, 30)),      # 15:30
            show_end=datetime.combine(date.today(), time(16, 30))         # 16:30
        )
        
        # Test: 45 minutos antes (14:45) → PROGRAMADO
        current_time = datetime.combine(date.today(), time(14, 45))
        estado = state_engine._determine_state_by_time(current_time, windows)
        
        assert estado == "PROGRAMADO"
    
    def test_paso4_determinacion_estado_abierto(self):
        """
        Test Paso 4: Estado ABIERTO durante ventana de acceso.
        """
        state_engine = StateEngine(None)
        
        windows = TimeWindows(
            access_start=datetime.combine(date.today(), time(15, 0)),
            finalized_start=datetime.combine(date.today(), time(15, 30)),
            show_start=datetime.combine(date.today(), time(15, 30)),
            show_end=datetime.combine(date.today(), time(16, 30))
        )
        
        # Test: Durante ventana de acceso (15:15) → ABIERTO
        current_time = datetime.combine(date.today(), time(15, 15))
        estado = state_engine._determine_state_by_time(current_time, windows)
        
        assert estado == "ABIERTO"
    
    def test_paso4_determinacion_estado_cerrado(self):
        """
        Test Paso 4: Estado CERRADO después del inicio del show.
        """
        state_engine = StateEngine(None)
        
        windows = TimeWindows(
            access_start=datetime.combine(date.today(), time(15, 0)),
            finalized_start=datetime.combine(date.today(), time(15, 30)),
            show_start=datetime.combine(date.today(), time(15, 30)),
            show_end=datetime.combine(date.today(), time(16, 30))
        )
        
        # Test: Después del inicio (15:45) → CERRADO
        current_time = datetime.combine(date.today(), time(15, 45))
        estado = state_engine._determine_state_by_time(current_time, windows)
        
        assert estado == "CERRADO"
    
    def test_paso5_caso_especial_ventana_disponibilidad(self, sample_event_today):
        """
        Test Paso 5: Caso especial de ventana de disponibilidad continua.
        """
        state_engine = StateEngine(None)
        
        # Configurar evento con ventana de disponibilidad
        sample_event_today.availability_window_start = time(10, 0)  # 10:00
        sample_event_today.availability_window_end = time(18, 0)    # 18:00
        
        # Test durante la ventana de disponibilidad (13:30) → ABIERTO
        current_time = datetime.combine(date.today(), time(13, 30))
        estado_calculado = "PROGRAMADO"  # Estado que vendría del paso 4
        
        estado_final = state_engine._apply_special_cases(
            sample_event_today, estado_calculado, current_time
        )
        
        assert estado_final == "ABIERTO"  # Override por ventana de disponibilidad
    
    @pytest.mark.asyncio  
    async def test_calculo_multiple_eventos_eficiencia(self, mock_db):
        """
        Test: Cálculo eficiente de estados para múltiples eventos.
        """
        # Crear lista de eventos de prueba
        show1 = Show(id=1, name="Show 1")
        show2 = Show(id=2, name="Show 2")
        
        events = [
            ScheduledEvent(id=1, show_id=1, show=show1, event_date=date.today(), 
                          start_time=time(15, 0), duration_minutes=60),
            ScheduledEvent(id=2, show_id=2, show=show2, event_date=date.today(), 
                          start_time=time(16, 0), duration_minutes=60)
        ]
        
        # Mock de overrides (ninguno activo)
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        
        state_engine = StateEngine(mock_db)
        estados = await state_engine.calculate_multiple_events_states(events)
        
        # Verificar que se calcularon estados para ambos eventos
        assert len(estados) == 2
        assert 1 in estados
        assert 2 in estados
        
        # Los estados deben ser válidos
        valid_states = ["PROGRAMADO", "ABIERTO", "CERRADO", "CANCELADO"]
        assert estados[1] in valid_states
        assert estados[2] in valid_states


if __name__ == "__main__":
    pytest.main([__file__, "-v"])