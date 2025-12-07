#!/bin/bash

echo "Testing CSV file upload..."
curl -X POST http://localhost:3000/api/ingest-sheet \
  -F "file=@test-products.csv"

echo -e "\n\nWaiting 2 seconds..."
sleep 2

echo -e "\nAsking question about the data..."
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the price of the SuperWidget?",
    "model": "llama2"
  }'

echo -e "\n"
