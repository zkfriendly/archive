# Expense Tracker

A modern expense tracking application that uses OCR to automatically extract information from receipts and provides natural language querying capabilities.

## Features

- 📸 Receipt scanning with automatic item and price detection
- 🤖 Automatic category detection and management
- 💬 Natural language querying for expenses
- 📱 Modern web interface
- 🔒 Secure data storage

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Bun, TypeScript, Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **AI/ML**: Anthropic Claude API for natural language processing
- **OCR**: Tesseract.js for receipt scanning

## Prerequisites

- Bun (latest version)
- Docker and Docker Compose
- Anthropic API key

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Set up environment variables:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```
4. Start development services:
   ```bash
   docker-compose up -d
   ```
5. Start the development servers:
   ```bash
   bun dev
   ```

## Project Structure

```
.
├── apps/
│   ├── frontend/     # React frontend application
│   └── backend/      # Bun backend API
├── packages/
│   └── shared/       # Shared types and utilities
└── docker-compose.yml
```

## License

MIT
