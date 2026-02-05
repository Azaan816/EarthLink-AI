import requests
import json
import sys

def test_tool_call():
    # The MCP server is running on localhost:8000
    url = "http://localhost:8000/mcp/call"
    
    # We want to test accessing the 'ndvi' metric for 'detroit'
    # This matches the file we verified at: frontend/public/data/detroit/ndvi.geojson
    payload = {
        "name": "get_precomputed_data",
        "arguments": {
            "region_name": "detroit",
            "metric": "ndvi",
            "dataset_id": "test_request_1"
        }
    }
    
    print(f"Sending request to {url}...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        result = response.json()
        print("\n--- Response ---")
        print(json.dumps(result, indent=2))
        
        # Verify the content
        if "content" in result and len(result["content"]) > 0:
            content_text = result["content"][0]["text"]
            data = json.loads(content_text)
            print("\n--- Parsed Tool Result ---")
            print(json.dumps(data, indent=2))
            
            # Validation logic
            expected_url = "/data/detroit/ndvi.geojson"
            if data.get("status") == "success":
                if data.get("url") == expected_url:
                    print(f"\n✅ Test Passed: Tool returned correct URL: {data.get('url')}")
                else:
                    print(f"\n⚠️ Test Warning: URL mismatch. Expected {expected_url}, got {data.get('url')}")
            else:
                print("\n❌ Test Failed: Tool returned error status.")
                
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error: Could not connect to the server at http://localhost:8000.")
        print("Please ensure 'python main.py' is running.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_tool_call()
