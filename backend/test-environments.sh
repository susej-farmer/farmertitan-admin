#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo "========================================="
echo "  Multi-Environment Testing Script"
echo "========================================="
echo ""

# Test 1: Health check without environment header (should use 'local')
echo -e "${YELLOW}Test 1: Health check (default environment)${NC}"
curl -s "${BASE_URL}/health" | jq '.'
echo ""

# Test 2: Health check with local environment
echo -e "${YELLOW}Test 2: Health check (local environment)${NC}"
curl -s -H "X-Environment: local" "${BASE_URL}/health" | jq '.'
echo ""

# Test 3: Health check with development environment
echo -e "${YELLOW}Test 3: Health check (development environment)${NC}"
curl -s -H "X-Environment: development" "${BASE_URL}/health" | jq '.'
echo ""

# Test 4: Health check with production environment
echo -e "${YELLOW}Test 4: Health check (production environment)${NC}"
curl -s -H "X-Environment: production" "${BASE_URL}/health" | jq '.'
echo ""

# Test 5: Invalid environment (should fallback to local)
echo -e "${YELLOW}Test 5: Invalid environment (should use local)${NC}"
curl -s -H "X-Environment: invalid" "${BASE_URL}/health" | jq '.'
echo ""

# Test 6: Login with different environments (requires valid credentials)
echo -e "${YELLOW}Test 6: Login attempt in LOCAL environment${NC}"
echo "Note: This will fail if credentials don't exist in local DB"
curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Environment: local" \
  -d '{"email":"test@example.com","password":"test123"}' | jq '.'
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  All tests completed!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "To test with different environments, use:"
echo "  curl -H 'X-Environment: local' ${BASE_URL}/api/..."
echo "  curl -H 'X-Environment: development' ${BASE_URL}/api/..."
echo "  curl -H 'X-Environment: production' ${BASE_URL}/api/..."
