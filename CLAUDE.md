# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands for Development

### Initial Setup (First Time)
```bash
# Navigate to workspace
cd /workspace

# Clone repository (if not already done)
git clone https://github.com/rvaquerizopdf/showstrack-app.git .

# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
cd showstrack-backend/backend
pip install -r requirements.txt
```

### Daily Development Workflow
```bash
# SSH into development container
ssh dev@[IP_SERVIDOR] -p 222

# Activate Python environment
cd /workspace && source venv/bin/activate

# Start backend server for development
cd showstrack-backend/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Testing and Validation
```bash
# Run comprehensive development environment test
cd /workspace/showstrack-dev/scripts
./test_dev_stack_script.sh --full

# Run basic environment test
./test_dev_stack_script.sh --basic
```

### Important URLs
- **Backend DEV**: `http://[IP_SERVIDOR]:8001`
- **API Documentation**: `http://[IP_SERVIDOR]:8001/docs`
- **Backend PROD**: `http://[IP_SERVIDOR]:8000`

## Architecture Overview

ShowsTrack is a **real-time show management system** built with a **microservices architecture**:

### Core Components
- **Backend API** (`showstrack-backend/`): FastAPI-based REST API with business logic
- **Frontend Admin** (`showstrack-frontend/admin/`): Vue.js 3 + TypeScript admin panel (planned)
- **Frontend Public** (`showstrack-frontend/public/`): HTML/CSS/JS display screens (planned)
- **Database** (`showstrack-postgres/`): PostgreSQL 15 with pgAdmin interface
- **Development Environment** (`showstrack-dev/`): Containerized development workspace

### Technology Stack
- **Backend**: FastAPI 0.104.1, SQLAlchemy 2.0.23, asyncpg 0.29.0, Pydantic 2.4.2
- **Database**: PostgreSQL 15, pgAdmin 4
- **Frontend**: Vue.js 3 + TypeScript (admin), HTML/CSS/JS (public displays)
- **Infrastructure**: Docker, Docker Compose, Ubuntu 22.04
- **Development**: Python 3.10, Node.js 18, Claude Code, SSH access

### Environment Configuration
- **Development Port**: 8001 (backend dev server)
- **Production Port**: 8000 (backend prod server)
- **Database**: PostgreSQL accessible via `$DATABASE_URL` environment variable
- **SSH Access**: Port 222 for remote development
- **Virtual Environment**: Located at `/workspace/venv`

## File Structure Patterns

### Backend Structure
```
showstrack-backend/
├── backend/
│   ├── app/
│   │   └── main.py          # FastAPI application entry point
│   └── requirements.txt     # Python dependencies
└── docker/
    └── showstrack_backend.yml  # Production container config
```

### Development Environment
```
showstrack-dev/
├── docker/
│   └── showstrack-dev.yml   # Development container config
├── scripts/
│   └── test_dev_stack_script.sh  # Environment testing script
└── README.md                # Comprehensive development FAQ
```

## Development Guidelines

### Python Development
- Always activate virtual environment: `source /workspace/venv/bin/activate`
- Backend entry point: `showstrack-backend/backend/app/main.py`
- Use FastAPI with async/await patterns
- Database operations use SQLAlchemy 2.0 with asyncpg driver

### Database Connection
- Use `DATABASE_URL` environment variable for connections
- Format: `postgresql+asyncpg://user:password@host:port/database`
- Connection testing available via development test script

### Testing Approach
- Use the comprehensive test script: `./test_dev_stack_script.sh --full`
- Tests cover environment setup, dependencies, database connectivity, and project structure
- Two modes: `--basic` (environment only) and `--full` (complete development stack)

### Container Environment
- Development happens inside Ubuntu 22.04 container
- SSH access on port 222 with user `dev`
- Git configured with project credentials
- Docker socket mounted for container management

## Project Status
- ✅ **Backend**: FastAPI functional with basic API endpoints
- ❌ **Frontend**: Structure created, implementation pending
- ✅ **Database**: PostgreSQL operational with pgAdmin
- ✅ **Development Environment**: Fully configured and tested
- ✅ **Documentation**: Comprehensive development FAQ available

## Key Directories
- `/workspace/` - Main development workspace
- `/workspace/venv/` - Python virtual environment
- `/workspace/showstrack-backend/backend/` - Backend source code
- `/workspace/showstrack-dev/scripts/` - Development automation scripts