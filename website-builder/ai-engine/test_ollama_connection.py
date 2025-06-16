#!/usr/bin/env python3
"""
Test script to verify Ollama connection
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from services.ollama_client import OllamaClient

async def test_connection():
    """Test the Ollama connection"""
    print("Testing Ollama connection...")
    print(f"OLLAMA_HOST environment variable: {os.getenv('OLLAMA_HOST')}")
    print(f"OLLAMA_BASE_URL environment variable: {os.getenv('OLLAMA_BASE_URL')}")
    
    # Create client
    client = OllamaClient()
    
    try:
        # Test basic connection
        print(f"\nTesting connection to: {client.base_url}")
        connection_result = await client.test_connection()
        print(f"Connection test result: {connection_result}")
        
        if connection_result["connected"]:
            print("\n✅ Connection successful!")
            
            # List available models
            print("\nListing available models...")
            models = await client.list_models()
            print(f"Available models ({len(models)}):")
            for model in models:
                print(f"  - {model}")
            
            # Test a simple generation if models are available
            if models:
                test_model = models[0]
                print(f"\nTesting generation with model: {test_model}")
                try:
                    result = await client.generate(
                        model=test_model,
                        prompt="Hello, how are you?",
                        max_tokens=100
                    )
                    print(f"Generation successful! Response: {result['response'][:100]}...")
                except Exception as e:
                    print(f"Generation failed: {e}")
        else:
            print(f"\n❌ Connection failed: {connection_result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
    
    finally:
        await client.close()

if __name__ == "__main__":
    # Load environment variables from .env file
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(test_connection())
