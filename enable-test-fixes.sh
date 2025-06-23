#!/bin/bash

chmod +x complete-educational-fix.sh
chmod +x diagnose-educational-tests.sh

echo "✅ Scripts are now executable!"
echo ""
echo "You have two options:"
echo ""
echo "1. Run the diagnosis first to understand the issue:"
echo "   ./diagnose-educational-tests.sh"
echo ""
echo "2. Or try the complete fix directly:"
echo "   ./complete-educational-fix.sh"
echo ""
echo "The diagnosis script will:"
echo "  • Check where the utils module actually exists"
echo "  • Run a minimal test to verify Jest is working"
echo "  • Show the current Jest configuration"
echo ""
echo "The complete fix script will:"
echo "  • Update Jest configuration for module resolution"
echo "  • Remove problematic jest.mock calls"
echo "  • Fix all repositoryId issues in ToolResultData"
echo "  • Fix the orchestrator test mock definitions"
