FROM ghcr.io/asyncfuncai/deepwiki-open:latest

# Create a patched version of data_pipeline.py that reads model from config
RUN cat > /tmp/patch_data_pipeline.py << 'EOF'
import os
import re

# Read the original file
with open('/app/api/data_pipeline.py', 'r') as f:
    content = f.read()

# Replace hardcoded model with dynamic config
old_pattern = r'encoding = tiktoken\.encoding_for_model\("text-embedding-3-small"\)'
new_code = '''from api.config import get_embedder_config
            embedder_config = get_embedder_config()
            model_name = embedder_config.get('model_kwargs', {}).get('model', 'text-embedding-3-small')
            encoding = tiktoken.encoding_for_model(model_name)'''

content = re.sub(old_pattern, new_code, content)

# Write the patched file
with open('/app/api/data_pipeline.py', 'w') as f:
    f.write(content)

print("Patched data_pipeline.py to use dynamic model configuration")
EOF

# Apply the patch
RUN python /tmp/patch_data_pipeline.py && rm /tmp/patch_data_pipeline.py

# Verify the patch was applied
RUN grep -A 3 "get_embedder_config" /app/api/data_pipeline.py || echo "Patch verification"

# Add a startup message to confirm custom image is being used
RUN echo '#!/bin/sh\necho "[CUSTOM] DeepWiki with dynamic embedding configuration started"\nexec "$@"' > /docker-entrypoint-custom.sh && \
    chmod +x /docker-entrypoint-custom.sh

ENTRYPOINT ["/docker-entrypoint-custom.sh"]
CMD ["sh", "-c", "cd /app && python api/main.py & npm start"]
