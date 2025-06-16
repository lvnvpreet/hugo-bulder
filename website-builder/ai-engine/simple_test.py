#!/usr/bin/env python3
"""
Simple test to check Ollama connection
"""
import os
import httpx
import asyncio
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_ollama_connection():
    """Test connection to Ollama service"""
      # Get Ollama URL from environment
    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    print(f"Environment variable OLLAMA_HOST: {repr(os.getenv('OLLAMA_HOST'))}")
    print(f"Testing connection to: {ollama_host}")
    
    # Ensure URL has protocol
    if not ollama_host.startswith(('http://', 'https://')):
        ollama_host = f"http://{ollama_host}"
        print(f"Added protocol, using: {ollama_host}")
    
    try:
        # Create HTTP client
        async with httpx.AsyncClient(timeout=30.0) as client:
            
            # Test basic connection
            print("\n1. Testing basic connection...")
            response = await client.get(f"{ollama_host}/api/tags")
            
            if response.status_code == 200:
                print("✅ Connection successful!")
                
                # Parse and display available models
                data = response.json()
                if "models" in data and data["models"]:
                    print(f"\n2. Available models ({len(data['models'])}):")
                    for model in data["models"]:
                        name = model.get("name", "Unknown")
                        size = model.get("size", 0)
                        size_gb = size / (1024**3) if size > 0 else 0
                        print(f"   - {name} ({size_gb:.1f} GB)")
                else:
                    print("\n2. No models found")
                
                # Test simple generation
                print("\n3. Testing simple generation...")
                test_data = {
                    "model": "qwen3:30b-a3b-fp16",
                    "prompt": "Say hello in one word",
                    "stream": False
                }
                
                gen_response = await client.post(
                    f"{ollama_host}/api/generate",
                    json=test_data,
                    timeout=60.0
                )
                
                if gen_response.status_code == 200:
                    result = gen_response.json()
                    print(f"✅ Generation test successful!")
                    print(f"   Response: {result.get('response', 'No response')}")
                else:
                    print(f"❌ Generation test failed: {gen_response.status_code}")
                    print(f"   Error: {gen_response.text}")
                    
            else:
                print(f"❌ Connection failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
    except httpx.ConnectError as e:
        print(f"❌ Connection error: {e}")
    except httpx.TimeoutException as e:
        print(f"❌ Timeout error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ollama_connection())
