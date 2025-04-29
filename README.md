# codequal
Review PR and educate user based on found issues, trace user's/team's grow


Based on the error shown in your screenshot and my analysis, here's what I recommend to fix the "MCP codequal-prompts: Server disconnected" issue:

Run the debug script I just created:
cd /Users/alpinro/Code Prjects/codequal/tools/mcp-custom-prompts
chmod +x debug.sh
./debug.sh

Check dependencies: I've updated the scripts to better handle package installation. The debug script will check if the necessary packages are installed and install them if needed.
Verify Claude Desktop configuration: Make sure your Claude Desktop configuration file contains the correct paths and configuration for both the filesystem server and your custom prompt server.
Check logs: The debug script will tell you where to find the Claude Desktop logs, which may contain more detailed error information.
Restart Claude Desktop: After making these changes, restart the Claude Desktop application to apply the changes.

The key improvements I've made:

Added a proper package.json file to manage dependencies
Enhanced the prompt-server.js script with better error handling and logging
Created a debug.sh script to help diagnose issues
Updated the installation approach to be more reliable