#!/bin/bash
routes=(
  "/"
  "/api/hello"
  "/telegram/users"
  "/videos"
)

for route in "${routes[@]}"; do
  echo "Testing $route"
  curl -s "http://localhost:3000$route" | grep -i "Missing parameter name" && echo "FAILED: $route"
done
