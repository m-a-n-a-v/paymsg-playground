#!/bin/bash
# Copy spec data from paymsg-specs sibling repository

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Copying spec data from paymsg-specs...${NC}"

# Base directories
SPECS_SRC="../paymsg-specs"
SPECS_DEST="public/specs"

# Create destination directories
mkdir -p "$SPECS_DEST/reference"
mkdir -p "$SPECS_DEST/mt-specs"
mkdir -p "$SPECS_DEST/mappings"
mkdir -p "$SPECS_DEST/rules"

# Copy reference data
echo -e "${GREEN}Copying reference data...${NC}"
cp "$SPECS_SRC/reference/currencies.json" "$SPECS_DEST/reference/"
cp "$SPECS_SRC/reference/countries.json" "$SPECS_DEST/reference/"
cp "$SPECS_SRC/reference/iban_formats.json" "$SPECS_DEST/reference/"
cp "$SPECS_SRC/reference/bic_spec.json" "$SPECS_DEST/reference/"
cp "$SPECS_SRC/reference/swift_charsets.json" "$SPECS_DEST/reference/"

# Copy MT specs
echo -e "${GREEN}Copying MT specs...${NC}"
cp "$SPECS_SRC/mt-specs/mt103.json" "$SPECS_DEST/mt-specs/"
cp "$SPECS_SRC/mt-specs/mt202.json" "$SPECS_DEST/mt-specs/"
cp "$SPECS_SRC/mt-specs/mt940.json" "$SPECS_DEST/mt-specs/"
cp "$SPECS_SRC/mt-specs/mt942.json" "$SPECS_DEST/mt-specs/"
cp "$SPECS_SRC/mt-specs/block_structure.json" "$SPECS_DEST/mt-specs/"

# Copy mappings
echo -e "${GREEN}Copying mapping data...${NC}"
cp "$SPECS_SRC/mappings/mt103_pacs008.json" "$SPECS_DEST/mappings/"
cp "$SPECS_SRC/mappings/mt202_pacs009.json" "$SPECS_DEST/mappings/"
cp "$SPECS_SRC/mappings/mt940_camt053.json" "$SPECS_DEST/mappings/"
cp "$SPECS_SRC/mappings/mt942_camt052.json" "$SPECS_DEST/mappings/"

# Copy rules
echo -e "${GREEN}Copying validation rules...${NC}"
cp "$SPECS_SRC/rules/pacs008_rules.json" "$SPECS_DEST/rules/"
cp "$SPECS_SRC/rules/pacs009_rules.json" "$SPECS_DEST/rules/"
cp "$SPECS_SRC/rules/camt052_rules.json" "$SPECS_DEST/rules/"
cp "$SPECS_SRC/rules/camt053_rules.json" "$SPECS_DEST/rules/"

echo -e "${BLUE}✓ All specs copied successfully!${NC}"
echo -e "${BLUE}Total files: $(find $SPECS_DEST -type f | wc -l)${NC}"
