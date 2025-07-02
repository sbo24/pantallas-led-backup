# ShowsTrack - Sistema de Gestion de Estados de Shows

Sistema completo para la gestion y visualizacion en tiempo real del estado de espectaculos.

## Arquitectura

`
ShowsTrack Stack
â”œâ”€â”€ showstrack-backend     # API + Business Logic
â”œâ”€â”€ showstrack-frontend    # Panel Admin + Pantallas Publicas  
â”œâ”€â”€ showstrack-postgres    # Base de Datos + Scripts
â”œâ”€â”€ showstrack-dev         # Entorno de Desarrollo
â”œâ”€â”€ docs                   # Documentacion
â””â”€â”€ scripts               # Scripts de Automatizacion
`

## Estado del Proyecto

- [x] **Backend**: FastAPI funcional con StateCalculationEngine
- [ ] **Frontend**: Estructura creada, pendiente implementacion
- [x] **PostgreSQL**: Base de datos operativa
- [x] **Dev Environment**: Entorno de desarrollo listo

## Stack Tecnologico

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend Admin**: Vue.js 3 + TypeScript (pendiente)
- **Frontend Public**: HTML/CSS/JS para Media4Display (pendiente)
- **Scripts**: Python + Pandas + Requests (pendiente)
- **Containerizacion**: Docker + Docker Compose
