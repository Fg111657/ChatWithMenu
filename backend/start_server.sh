#!/bin/bash
# Start server - reads config from .env file

cd /root/chatwithmenu/Backend/python

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Copy .env.template to .env and add your keys:"
    echo "  cp .env.template .env"
    echo "  # Then edit .env with real keys from Supabase dashboard"
    exit 1
fi

# Start server (will load .env automatically via python-dotenv)
/root/chatwithmenu/Backend/python/venv/bin/python server.py
