#!/bin/bash

# Script to update dashboard with your actual datasource UID

echo "Enter your PostgreSQL datasource UID (you can find it in the datasources list):"
read -r UID

if [ -z "$UID" ]; then
  echo "UID cannot be empty"
  exit 1
fi

# Update the simple dashboard with the actual UID
sed "s/supabase-postgres/$UID/g" codequal-performance-simple.json > codequal-performance-final.json

echo "✅ Dashboard updated with UID: $UID"
echo "📝 Now import: codequal-performance-final.json"