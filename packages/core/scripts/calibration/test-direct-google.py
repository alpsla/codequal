#!/usr/bin/env python3

"""
Test the Google API directly
"""

import os
import sys
import google.generativeai as genai

# Set API key from environment
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("Error: GOOGLE_API_KEY environment variable not set")
    sys.exit(1)

# Configure the API
genai.configure(api_key=GOOGLE_API_KEY)

# Test a basic model call
model = genai.GenerativeModel(model_name="gemini-pro")
response = model.generate_content("Hello, what model are you?")
print("Response from gemini-pro:")
print(response.text)

# Try with a different model format
try:
    print("\nTrying with a provider/model format...")
    model2 = genai.GenerativeModel(model_name="google/gemini-pro")
    response2 = model2.generate_content("Hello, what model are you?")
    print("Response from google/gemini-pro:")
    print(response2.text)
except Exception as e:
    print(f"Error with provider/model format: {e}")

# Show what happens when we use extract_base_model_name
print("\nTrying with extract_base_model_name...")

def extract_base_model_name(model_name):
    """Extract the base model name without provider prefix."""
    if not model_name:
        return "gemini-pro"
    
    # If the model name contains a provider prefix (e.g., 'openai/gpt-4'),
    # extract just the model part after the '/'
    if "/" in model_name:
        return model_name.split("/", 1)[1]
    
    return model_name

model_name = "google/gemini-pro"
base_model_name = extract_base_model_name(model_name)
print(f"Original: {model_name}, After extraction: {base_model_name}")

try:
    model3 = genai.GenerativeModel(model_name=base_model_name)
    response3 = model3.generate_content("Hello, what model are you?")
    print("Response from extracted model name:")
    print(response3.text)
except Exception as e:
    print(f"Error with extracted model name: {e}")