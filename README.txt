tg-analytics-bot
================

Overview
--------
Telegram bot that stores chat messages in Postgres, tracks basic stats, and can analyze a user's recent messages. Stats are cached in Redis. The bot runs with Telegraf and can call an AI provider via OpenRouter (with a local heuristic fallback).

Features
--------
- Save all incoming text messages into Postgres
- /stats command with presets (day/week/month/all) and Redis caching
- /analyze command for a specific user (via @username or reply)
- AI analysis via OpenRouter, fallback to local word stats

Tech Stack
----------
- Node.js + TypeScript + ts-node
- Telegraf (Telegram bot framework)
- Postgres (data storage)
- Redis (stats cache)
- OpenRouter (AI analysis)

Project Structure
-----------------
- apps/bot/src/index.ts: bot entrypoint, commands, and message ingest
- apps/bot/src/models: Postgres access layer (chats, users, messages, stats)
- apps/bot/src/services: AI providers and local analysis
- apps/bot/src/db: Postgres and Redis clients
- infra/docker-compose.yml: Postgres, Redis, bot, and a placeholder web container
- infra/db/init/001_init.sql: database schema

Setup (Docker)
--------------
1) Copy env template and fill real secrets:
   cp .env.example .env
2) Start services:
   docker compose -f infra/docker-compose.yml up --build

Local Run (without Docker)
--------------------------
1) Install deps in apps/bot:
   cd apps/bot && npm install
2) Ensure Postgres + Redis are running and DATABASE_URL/REDIS_URL are set
3) Run the bot:
   npx ts-node src/index.ts

Environment Variables
---------------------
Required:
- BOT_TOKEN: Telegram bot token
- DATABASE_URL: Postgres connection string
- REDIS_URL: Redis connection string

Optional:
- CACHE_TTL_SECONDS (default 1200)
- OPENROUTER_API_KEY
- OPENROUTER_MODEL (default openai/gpt-4o-mini)

Notes:
- .env.example contains placeholders; replace with real secrets.
- If OpenRouter is not configured, /analyze uses a local heuristic summary.

Database Schema (summary)
-------------------------
- chats: telegram_chat_id, title
- users: telegram_user_id, username, first_name, last_name
- messages: chat_id, user_id, telegram_message_id, text, created_at

Bot Commands
------------
- /ping: health check
- /stats: inline keyboard with presets
- /analyze @username: AI analysis of the user's last messages
- /analyze (reply): analyze the replied user's messages
