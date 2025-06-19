import sys
sys.path.append('d:/projects/hugo-bulder/website-builder/ai-engine/src')

try:
    from config import MODEL_PRESETS
    print(f"MODEL_PRESETS type: {type(MODEL_PRESETS)}")
    print(f"MODEL_PRESETS content: {MODEL_PRESETS}")
    
    content_preset = MODEL_PRESETS.get("content_generation", {})
    print(f"Content preset: {content_preset}")
    print(f"Content preset type: {type(content_preset)}")
    
except Exception as e:
    print(f"Error importing or accessing MODEL_PRESETS: {e}")
    import traceback
    traceback.print_exc()
