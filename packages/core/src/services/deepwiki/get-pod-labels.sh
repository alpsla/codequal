#!/bin/bash

# Find the DeepWiki pod and get its labels
kubectl get pod -n codequal-dev deepwiki-fixed-5b95f566b8-wh4h4 -o json | jq .metadata.labels
