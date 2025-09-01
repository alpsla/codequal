#!/bin/bash

# Test Results Viewer
# Interactive script to view and analyze test results

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

RESULTS_DIR="/Users/alpinro/Code Prjects/codequal/packages/agents/src/two-branch/test-results"

echo -e "${MAGENTA}╔════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║         CodeQual Test Results Viewer          ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to show menu
show_menu() {
    echo -e "${CYAN}Select an option:${NC}"
    echo "1) View Latest Session Report"
    echo "2) View Master Coverage Matrix"
    echo "3) List All Sessions"
    echo "4) View Specific Session"
    echo "5) Generate Summary Statistics"
    echo "6) Export Results to HTML"
    echo "7) Compare Two Sessions"
    echo "8) Exit"
    echo -n "Choice: "
}

# Function to view latest session
view_latest_session() {
    echo -e "\n${YELLOW}Latest Session Report${NC}"
    echo "═══════════════════════════════════════════════"
    
    LATEST=$(ls -t "$RESULTS_DIR/reports"/*.md 2>/dev/null | head -1)
    
    if [ -z "$LATEST" ]; then
        echo -e "${RED}No session reports found${NC}"
        return
    fi
    
    # Use bat if available for syntax highlighting, otherwise cat
    if command -v bat &> /dev/null; then
        bat --style=grid,numbers "$LATEST"
    else
        cat "$LATEST"
    fi
}

# Function to view coverage matrix
view_coverage_matrix() {
    echo -e "\n${YELLOW}Master Coverage Matrix${NC}"
    echo "═══════════════════════════════════════════════"
    
    MATRIX="$RESULTS_DIR/matrices/master-coverage-matrix.md"
    
    if [ ! -f "$MATRIX" ]; then
        echo -e "${RED}Coverage matrix not found${NC}"
        return
    fi
    
    if command -v bat &> /dev/null; then
        bat --style=grid,numbers "$MATRIX"
    else
        cat "$MATRIX"
    fi
}

# Function to list all sessions
list_sessions() {
    echo -e "\n${YELLOW}All Test Sessions${NC}"
    echo "═══════════════════════════════════════════════"
    
    if [ ! -d "$RESULTS_DIR/sessions" ]; then
        echo -e "${RED}No sessions found${NC}"
        return
    fi
    
    echo -e "${CYAN}Session ID                    | Status      | Date${NC}"
    echo "─────────────────────────────────────────────────────────────"
    
    for session_dir in "$RESULTS_DIR/sessions"/*; do
        if [ -d "$session_dir" ]; then
            SESSION_ID=$(basename "$session_dir")
            
            # Read metadata if exists
            if [ -f "$session_dir/metadata.json" ]; then
                STATUS=$(jq -r '.status // "unknown"' "$session_dir/metadata.json" 2>/dev/null || echo "unknown")
                DATE=$(jq -r '.timestamp // "unknown"' "$session_dir/metadata.json" 2>/dev/null || echo "unknown")
            else
                STATUS="unknown"
                DATE="unknown"
            fi
            
            # Color code status
            case $STATUS in
                completed)
                    STATUS_COLOR="${GREEN}✅ completed${NC}"
                    ;;
                in_progress)
                    STATUS_COLOR="${YELLOW}⏳ in_progress${NC}"
                    ;;
                failed)
                    STATUS_COLOR="${RED}❌ failed${NC}"
                    ;;
                *)
                    STATUS_COLOR="${CYAN}? unknown${NC}"
                    ;;
            esac
            
            printf "%-30s | %-20s | %s\n" "$SESSION_ID" "$STATUS_COLOR" "$DATE"
        fi
    done
}

# Function to view specific session
view_specific_session() {
    echo -e "\n${YELLOW}Enter Session ID:${NC} "
    read -r SESSION_ID
    
    REPORT="$RESULTS_DIR/reports/${SESSION_ID}.md"
    
    if [ ! -f "$REPORT" ]; then
        echo -e "${RED}Session report not found: $SESSION_ID${NC}"
        return
    fi
    
    if command -v bat &> /dev/null; then
        bat --style=grid,numbers "$REPORT"
    else
        cat "$REPORT"
    fi
}

# Function to generate summary statistics
generate_summary() {
    echo -e "\n${YELLOW}Summary Statistics${NC}"
    echo "═══════════════════════════════════════════════"
    
    # Count sessions
    TOTAL_SESSIONS=$(find "$RESULTS_DIR/sessions" -maxdepth 1 -type d | wc -l)
    TOTAL_SESSIONS=$((TOTAL_SESSIONS - 1)) # Subtract parent directory
    
    echo -e "${CYAN}Total Sessions:${NC} $TOTAL_SESSIONS"
    
    # Analyze latest session
    LATEST_SESSION=$(ls -t "$RESULTS_DIR/sessions" | head -1)
    
    if [ ! -z "$LATEST_SESSION" ] && [ -f "$RESULTS_DIR/sessions/$LATEST_SESSION/raw-results.json" ]; then
        echo -e "\n${CYAN}Latest Session Analysis:${NC}"
        
        # Use jq to analyze JSON
        if command -v jq &> /dev/null; then
            TOTAL_TESTS=$(jq '.tests | length' "$RESULTS_DIR/sessions/$LATEST_SESSION/raw-results.json")
            SUCCESS_TESTS=$(jq '.tests | map(select(.status == "success")) | length' "$RESULTS_DIR/sessions/$LATEST_SESSION/raw-results.json")
            AVG_TIME=$(jq '.tests | map(.time) | add / length' "$RESULTS_DIR/sessions/$LATEST_SESSION/raw-results.json")
            
            echo "  Total Tests: $TOTAL_TESTS"
            echo "  Successful: $SUCCESS_TESTS"
            echo "  Success Rate: $(echo "scale=1; $SUCCESS_TESTS * 100 / $TOTAL_TESTS" | bc)%"
            echo "  Avg Execution Time: ${AVG_TIME}ms"
            
            # Language breakdown
            echo -e "\n${CYAN}Tests by Language:${NC}"
            jq -r '.tests | group_by(.language) | .[] | "\(.[]|.language): \(length) tests"' \
                "$RESULTS_DIR/sessions/$LATEST_SESSION/raw-results.json" | head -1 | while read line; do
                echo "  $line"
            done
        fi
    fi
    
    # Tool installation status
    echo -e "\n${CYAN}Tool Coverage Overview:${NC}"
    
    if [ -f "$RESULTS_DIR/matrices/master-coverage-matrix.md" ]; then
        # Extract coverage percentages
        grep "| .* | .*% |" "$RESULTS_DIR/matrices/master-coverage-matrix.md" 2>/dev/null | head -8 || true
    fi
}

# Function to export to HTML
export_to_html() {
    echo -e "\n${YELLOW}Exporting results to HTML...${NC}"
    
    HTML_FILE="$RESULTS_DIR/test-results-export.html"
    
    cat << 'HTML_HEAD' > "$HTML_FILE"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Test Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin: 20px 0;
        }
        th {
            background: #3498db;
            color: white;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .success { color: #27ae60; font-weight: bold; }
        .failure { color: #e74c3c; font-weight: bold; }
        .warning { color: #f39c12; font-weight: bold; }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔬 CodeQual Test Results Dashboard</h1>
        <p>Generated: <strong>$(date)</strong></p>
HTML_HEAD
    
    # Add latest session data
    LATEST_SESSION=$(ls -t "$RESULTS_DIR/sessions" | head -1)
    
    if [ ! -z "$LATEST_SESSION" ] && [ -f "$RESULTS_DIR/sessions/$LATEST_SESSION/raw-results.json" ]; then
        echo "<h2>Latest Session: $LATEST_SESSION</h2>" >> "$HTML_FILE"
        echo "<table>" >> "$HTML_FILE"
        echo "<tr><th>Language</th><th>Tool</th><th>Status</th><th>Expected</th><th>Actual</th><th>Accuracy</th><th>Time (ms)</th></tr>" >> "$HTML_FILE"
        
        # Parse JSON and create table rows
        jq -r '.tests[] | "<tr><td>\(.language)</td><td>\(.tool)</td><td class=\"\(if .status == "success" then "success" else "failure" end)\">\(.status)</td><td>\(.expected)</td><td>\(.actual)</td><td>\(if .expected > 0 then ((.actual / .expected) * 100 | tostring | .[0:4]) else "0" end)%</td><td>\(.time)</td></tr>"' \
            "$RESULTS_DIR/sessions/$LATEST_SESSION/raw-results.json" >> "$HTML_FILE"
        
        echo "</table>" >> "$HTML_FILE"
    fi
    
    # Add coverage matrix summary
    echo "<h2>Coverage Matrix</h2>" >> "$HTML_FILE"
    echo "<pre>" >> "$HTML_FILE"
    head -50 "$RESULTS_DIR/matrices/master-coverage-matrix.md" >> "$HTML_FILE"
    echo "</pre>" >> "$HTML_FILE"
    
    # Close HTML
    cat << 'HTML_FOOT' >> "$HTML_FILE"
    </div>
</body>
</html>
HTML_FOOT
    
    echo -e "${GREEN}✅ HTML report exported to: $HTML_FILE${NC}"
    
    # Try to open in browser
    if command -v open &> /dev/null; then
        open "$HTML_FILE"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$HTML_FILE"
    fi
}

# Function to compare two sessions
compare_sessions() {
    echo -e "\n${YELLOW}Compare Two Sessions${NC}"
    echo -n "Enter first session ID: "
    read -r SESSION1
    echo -n "Enter second session ID: "
    read -r SESSION2
    
    FILE1="$RESULTS_DIR/sessions/$SESSION1/raw-results.json"
    FILE2="$RESULTS_DIR/sessions/$SESSION2/raw-results.json"
    
    if [ ! -f "$FILE1" ] || [ ! -f "$FILE2" ]; then
        echo -e "${RED}One or both sessions not found${NC}"
        return
    fi
    
    echo -e "\n${CYAN}Comparison: $SESSION1 vs $SESSION2${NC}"
    echo "═══════════════════════════════════════════════"
    
    if command -v jq &> /dev/null; then
        # Compare test counts
        TESTS1=$(jq '.tests | length' "$FILE1")
        TESTS2=$(jq '.tests | length' "$FILE2")
        echo "Total Tests: $TESTS1 vs $TESTS2"
        
        # Compare success rates
        SUCCESS1=$(jq '.tests | map(select(.status == "success")) | length' "$FILE1")
        SUCCESS2=$(jq '.tests | map(select(.status == "success")) | length' "$FILE2")
        RATE1=$(echo "scale=1; $SUCCESS1 * 100 / $TESTS1" | bc)
        RATE2=$(echo "scale=1; $SUCCESS2 * 100 / $TESTS2" | bc)
        echo "Success Rate: ${RATE1}% vs ${RATE2}%"
        
        # Compare execution times
        TIME1=$(jq '.tests | map(.time) | add' "$FILE1")
        TIME2=$(jq '.tests | map(.time) | add' "$FILE2")
        echo "Total Time: ${TIME1}ms vs ${TIME2}ms"
        
        # Show improvements
        echo -e "\n${CYAN}Tool Status Changes:${NC}"
        jq -r '.tests[] | "\(.tool):\(.status)"' "$FILE1" | sort > /tmp/session1_status
        jq -r '.tests[] | "\(.tool):\(.status)"' "$FILE2" | sort > /tmp/session2_status
        
        diff --side-by-side --suppress-common-lines /tmp/session1_status /tmp/session2_status 2>/dev/null || true
    fi
}

# Main loop
while true; do
    echo ""
    show_menu
    read -r choice
    
    case $choice in
        1)
            view_latest_session
            ;;
        2)
            view_coverage_matrix
            ;;
        3)
            list_sessions
            ;;
        4)
            view_specific_session
            ;;
        5)
            generate_summary
            ;;
        6)
            export_to_html
            ;;
        7)
            compare_sessions
            ;;
        8)
            echo -e "\n${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done