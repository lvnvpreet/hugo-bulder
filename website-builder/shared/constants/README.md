# Shared Theme Constants

This directory contains shared constants and types used by multiple components of the hugo-builder:

- `themes.ts`: Constants for Hugo themes, color schemes, and related helpers

## Usage

These constants are used by:

1. **Backend ThemeDetectionService**: For automatic theme selection based on user requirements
2. **Hugo Generator**: For theme installation and configuration
3. **Frontend components**: For consistent theme visualization  

## Available Exports

- `VERIFIED_THEMES`: Array of validated Hugo themes with metadata
- `INDUSTRY_COLORS`: Industry-specific color schemes
- `CATEGORY_THEME_MAPPING`: Mapping business categories to appropriate themes
- Helper functions for theme selection

## Adding New Themes

When adding a new theme:

1. Add it to `VERIFIED_THEMES` array
2. Verify the GitHub URL and installation commands
3. Update appropriate mappings in `CATEGORY_THEME_MAPPING`
4. Test theme installation with the Hugo generator
