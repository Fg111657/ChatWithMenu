#!/bin/bash
#
# Setup Cron Job for Trust Score Calculation
#
# This script sets up a daily cron job to calculate restaurant trust scores
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Trust Score Cron Job Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Paths
SCRIPT_DIR="/var/www/chatwithmenu/Backend/python"
VENV_PYTHON="/var/www/chatwithmenu/Backend/.venv/bin/python3"
CRON_SCRIPT="${SCRIPT_DIR}/cron_calculate_trust_scores.py"
LOG_FILE="/var/log/trust_scores_cron.log"

# Verify files exist
echo -e "${YELLOW}Checking files...${NC}"
if [ ! -f "${CRON_SCRIPT}" ]; then
    echo -e "${RED}Error: ${CRON_SCRIPT} not found${NC}"
    exit 1
fi

if [ ! -f "${VENV_PYTHON}" ]; then
    echo -e "${RED}Error: ${VENV_PYTHON} not found${NC}"
    exit 1
fi

# Make script executable
chmod +x "${CRON_SCRIPT}"
echo -e "${GREEN}✓ Made cron script executable${NC}"

# Create log file with proper permissions
touch "${LOG_FILE}"
chmod 644 "${LOG_FILE}"
echo -e "${GREEN}✓ Created log file: ${LOG_FILE}${NC}"

# Ask for JWT token
echo ""
echo -e "${YELLOW}You need a JWT token for authentication.${NC}"
echo "Options:"
echo "  1. Use a service account token (recommended)"
echo "  2. Generate a long-lived token from Supabase"
echo "  3. Set up token refresh mechanism"
echo ""
read -p "Enter JWT token (or press Enter to skip): " JWT_TOKEN

# Create environment file for cron
ENV_FILE="${SCRIPT_DIR}/.env.cron"
if [ ! -z "$JWT_TOKEN" ]; then
    echo "TRUST_SCORE_CRON_TOKEN=${JWT_TOKEN}" > "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
    echo -e "${GREEN}✓ Saved token to ${ENV_FILE}${NC}"
else
    echo -e "${YELLOW}⚠ Skipping token setup - you'll need to set TRUST_SCORE_CRON_TOKEN manually${NC}"
fi

# Create cron job
CRON_COMMAND="0 2 * * * cd ${SCRIPT_DIR} && source ${ENV_FILE} 2>/dev/null; ${VENV_PYTHON} ${CRON_SCRIPT} >> ${LOG_FILE} 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "cron_calculate_trust_scores.py"; then
    echo -e "${YELLOW}Cron job already exists. Skipping...${NC}"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "${CRON_COMMAND}") | crontab -
    echo -e "${GREEN}✓ Added cron job (runs daily at 2 AM)${NC}"
fi

# Display current crontab
echo ""
echo "Current crontab:"
crontab -l | grep trust_scores || echo "No trust score cron jobs found"

# Manual test
echo ""
echo -e "${YELLOW}To manually test the cron job, run:${NC}"
echo "  cd ${SCRIPT_DIR}"
echo "  source ${ENV_FILE} 2>/dev/null"
echo "  ${VENV_PYTHON} ${CRON_SCRIPT}"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "  tail -f ${LOG_FILE}"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
