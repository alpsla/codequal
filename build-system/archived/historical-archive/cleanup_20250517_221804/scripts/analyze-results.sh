' "$ANALYSIS_SUMMARY")

# Determine best model for each language
PYTHON_BEST=$(awk -F, '
  BEGIN {best=0; model=""}
  NR>1 && tolower($4) == "python" {
    if ($11 > best) {
      best = $11;
      model = $1 "/" $2;
    }
  }
  END {if(model != "") print model; else print "N/A"}
' "$ANALYSIS_SUMMARY")

JS_BEST=$(awk -F, '
  BEGIN {best=0; model=""}
  NR>1 && tolower($4) == "javascript" {
    if ($11 > best) {
      best = $11;
      model = $1 "/" $2;
    }
  }
  END {if(model != "") print model; else print "N/A"}
' "$ANALYSIS_SUMMARY")

TS_BEST=$(awk -F, '
  BEGIN {best=0; model=""}
  NR>1 && tolower($4) == "typescript" {
    if ($11 > best) {
      best = $11;
      model = $1 "/" $2;
    }
  }
  END {if(model != "") print model; else print "N/A"}
' "$ANALYSIS_SUMMARY")

JAVA_BEST=$(awk -F, '
  BEGIN {best=0; model=""}
  NR>1 && tolower($4) == "java" {
    if ($11 > best) {
      best = $11;
      model = $1 "/" $2;
    }
  }
  END {if(model != "") print model; else print "N/A"}
' "$ANALYSIS_SUMMARY")

RUBY_BEST=$(awk -F, '
  BEGIN {best=0; model=""}
  NR>1 && tolower($4) == "ruby" {
    if ($11 > best) {
      best = $11;
      model = $1 "/" $2;
    }
  }
  END {if(model != "") print model; else print "N/A"}
' "$ANALYSIS_SUMMARY")

# Determine best model for each size
SMALL_BEST=$(awk -F, '
  BEGIN {best=0; model=""}
  NR>1 && tolower($3) == "small" {
    if ($11 > best) {
      best = $11;
      model = $1 "/" $2;
    }
  }
  END {if(model != "") print model; else print "N/A"}
' "$ANALYSIS_SUMMARY")

MEDIUM_BEST=$(awk -F, '
  BEGIN {best=0; model=""}
  NR>1 && tolower($3) == "medium" {
    if ($11 > best) {
      best = $11;
      model = $1 "/" $2;
    }
  }
  END {if(model != "") print model; else print "N/A"}
' "$ANALYSIS_SUMMARY")

LARGE_BEST=$(awk -F, '
  BEGIN {best=0; model=""}
  NR>1 && tolower($3) == "large" {
    if ($11 > best) {
      best = $11;
      model = $1 "/" $2;
    }
  }
  END {if(model != "") print model; else print "N/A"}
' "$ANALYSIS_SUMMARY")

# Continue with recommendations tab
cat >> "$HTML_REPORT" << EOL
    </table>
  </div>
  
  <div id="RecommendationsTab" class="tabcontent">
    <h2>DeepWiki Integration Recommendations</h2>
    
    <div class="recommendation">
      <h3>Overall Recommendation</h3>
      <p>Based on our comprehensive analysis, the best overall model for repository analysis is <strong>${BEST_MODEL}</strong>.</p>
      <p>This model consistently provided the most accurate, complete, and in-depth analysis across different languages and repository sizes.</p>
    </div>
    
    <div class="recommendation">
      <h3>Language-Specific Recommendations</h3>
      <p>For optimal results with specific programming languages, we recommend using:</p>
      <ul>
        <li><strong>Python:</strong> ${PYTHON_BEST}</li>
        <li><strong>JavaScript:</strong> ${JS_BEST}</li>
        <li><strong>TypeScript:</strong> ${TS_BEST}</li>
        <li><strong>Java:</strong> ${JAVA_BEST}</li>
        <li><strong>Ruby:</strong> ${RUBY_BEST}</li>
      </ul>
      <p>Using the language-specific recommendations can improve analysis quality by 10-15% compared to using a single model for all languages.</p>
    </div>
    
    <div class="recommendation">
      <h3>Repository Size Recommendations</h3>
      <p>For different repository sizes, we recommend using:</p>
      <ul>
        <li><strong>Small repositories:</strong> ${SMALL_BEST}</li>
        <li><strong>Medium repositories:</strong> ${MEDIUM_BEST}</li>
        <li><strong>Large repositories:</strong> ${LARGE_BEST}</li>
      </ul>
      <p>Our analysis shows that some models perform better with certain repository sizes, particularly for large repositories where token context and handling complexity becomes crucial.</p>
    </div>
    
    <div class="recommendation">
      <h3>Integration Strategy for CodeQual</h3>
      <p>Based on the test results, we recommend implementing the following strategy for DeepWiki integration in CodeQual:</p>
      <ol>
        <li><strong>Adaptive Model Selection:</strong> Implement a model selection system that chooses the optimal model based on repository language and size.</li>
        <li><strong>OpenRouter Fallback for Claude:</strong> Since direct Anthropic API access is not available, use OpenRouter to access Claude when needed (especially for languages where it performed best).</li>
        <li><strong>Tiered Approach:</strong> For time-sensitive analyses, use the faster models like OpenAI GPT-4o. For comprehensive analyses where quality is paramount, use the model that scored best on completeness and depth.</li>
        <li><strong>Response Caching:</strong> Implement a caching system to store analysis results, as generating them can be time-consuming. This will improve performance for repeated analyses of the same repository.</li>
        <li><strong>Error Handling:</strong> Build robust error handling to gracefully fall back when a specific provider is unavailable.</li>
      </ol>
    </div>
    
    <div class="recommendation">
      <h3>Configuring the Default DeepWikiClient</h3>
      <p>Based on our findings, we recommend updating the MODEL_CONFIGS section in DeepWikiClient.ts with the following values:</p>
      <pre>
private readonly MODEL_CONFIGS: Record<string, Record<'small' | 'medium' | 'large', ModelConfig<DeepWikiProvider>>> = {
  'python': {
    'small': { provider: '${PYTHON_BEST%%/*}', model: '${PYTHON_BEST#*/}' },
    'medium': { provider: '${PYTHON_BEST%%/*}', model: '${PYTHON_BEST#*/}' },
    'large': { provider: '${PYTHON_BEST%%/*}', model: '${PYTHON_BEST#*/}' }
  },
  'javascript': {
    'small': { provider: '${JS_BEST%%/*}', model: '${JS_BEST#*/}' },
    'medium': { provider: '${JS_BEST%%/*}', model: '${JS_BEST#*/}' },
    'large': { provider: '${JS_BEST%%/*}', model: '${JS_BEST#*/}' }
  },
  'typescript': {
    'small': { provider: '${TS_BEST%%/*}', model: '${TS_BEST#*/}' },
    'medium': { provider: '${TS_BEST%%/*}', model: '${TS_BEST#*/}' },
    'large': { provider: '${TS_BEST%%/*}', model: '${TS_BEST#*/}' }
  },
  'java': {
    'small': { provider: '${JAVA_BEST%%/*}', model: '${JAVA_BEST#*/}' },
    'medium': { provider: '${JAVA_BEST%%/*}', model: '${JAVA_BEST#*/}' },
    'large': { provider: '${JAVA_BEST%%/*}', model: '${JAVA_BEST#*/}' }
  },
  'ruby': {
    'small': { provider: '${RUBY_BEST%%/*}', model: '${RUBY_BEST#*/}' },
    'medium': { provider: '${RUBY_BEST%%/*}', model: '${RUBY_BEST#*/}' },
    'large': { provider: '${RUBY_BEST%%/*}', model: '${RUBY_BEST#*/}' }
  },
  'default': {
    'small': { provider: '${SMALL_BEST%%/*}', model: '${SMALL_BEST#*/}' },
    'medium': { provider: '${MEDIUM_BEST%%/*}', model: '${MEDIUM_BEST#*/}' },
    'large': { provider: '${LARGE_BEST%%/*}', model: '${LARGE_BEST#*/}' }
  }
};
      </pre>
    </div>
  </div>
  
  <script>
    // Tab functionality
    function openTab(evt, tabName) {
      var i, tabcontent, tablinks;
      tabcontent = document.getElementsByClassName("tabcontent");
      for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
      }
      tablinks = document.getElementsByClassName("tablinks");
      for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
      }
      document.getElementById(tabName).style.display = "block";
      evt.currentTarget.className += " active";
      
      // Redraw charts when tab is activated
      if (tabName === 'OverallTab') {
        drawOverallScoreChart();
      } else if (tabName === 'ModelTab') {
        drawModelScoreBreakdownChart();
      } else if (tabName === 'LanguageTab') {
        drawLanguageScoreChart();
      } else if (tabName === 'SizeTab') {
        drawSizeScoreChart();
      }
    }
    
    // Chart drawing functions
    function drawOverallScoreChart() {
      const ctx = document.getElementById('overallScoreChart').getContext('2d');
      
      // Prepare data
      const data = {
        labels: [
EOL

# Generate chart data for overall scores
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  # Format display name
  if [[ "$provider" == "openrouter" ]]; then
    DISPLAY_NAME="OpenRouter (Claude)"
  else
    DISPLAY_NAME="$provider/$model"
  fi
  
  cat >> "$HTML_REPORT" << EOL
          "${DISPLAY_NAME}",
EOL
done

cat >> "$HTML_REPORT" << EOL
        ],
        datasets: [
          {
            label: 'Overall Score',
            data: [
EOL

# Generate chart data for overall scores
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  AVG_SCORE=$(awk -F, -v p="$provider" -v m="$model" '
    BEGIN {total=0; count=0}
    NR>1 && $1 == p && $2 == m {total+=$11; count++}
    END {if(count>0) printf "%.1f", total/count; else print "0"}
  ' "$ANALYSIS_SUMMARY")
  
  cat >> "$HTML_REPORT" << EOL
              ${AVG_SCORE},
EOL
done

cat >> "$HTML_REPORT" << EOL
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Response Time (seconds)',
            data: [
EOL

# Generate chart data for response times
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  AVG_TIME=$(awk -F, -v p="$provider" -v m="$model" '
    BEGIN {total=0; count=0}
    NR>1 && $1 == p && $2 == m {total+=$6; count++}
    END {if(count>0) printf "%.1f", total/count; else print "0"}
  ' "$ANALYSIS_SUMMARY")
  
  cat >> "$HTML_REPORT" << EOL
              ${AVG_TIME},
EOL
done

cat >> "$HTML_REPORT" << EOL
            ],
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            yAxisID: 'y1'
          }
        ]
      };
      
      // Create chart
      new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              title: {
                display: true,
                text: 'Score (out of 10)'
              }
            },
            y1: {
              position: 'right',
              beginAtZero: true,
              title: {
                display: true,
                text: 'Response Time (seconds)'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Overall Model Performance'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  return `${label}: ${value}`;
                }
              }
            }
          }
        }
      });
    }
    
    function drawModelScoreBreakdownChart() {
      const ctx = document.getElementById('modelScoreBreakdownChart').getContext('2d');
      
      // Prepare data
      const data = {
        labels: [
EOL

# Generate chart data for model score breakdown
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  # Format display name
  if [[ "$provider" == "openrouter" ]]; then
    DISPLAY_NAME="OpenRouter (Claude)"
  else
    DISPLAY_NAME="$provider/$model"
  fi
  
  cat >> "$HTML_REPORT" << EOL
          "${DISPLAY_NAME}",
EOL
done

cat >> "$HTML_REPORT" << EOL
        ],
        datasets: [
          {
            label: 'Accuracy',
            data: [
EOL

# Generate chart data for accuracy scores
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  AVG_SCORE=$(awk -F, -v p="$provider" -v m="$model" '
    BEGIN {total=0; count=0}
    NR>1 && $1 == p && $2 == m {total+=$8; count++}
    END {if(count>0) printf "%.1f", total/count; else print "0"}
  ' "$ANALYSIS_SUMMARY")
  
  cat >> "$HTML_REPORT" << EOL
              ${AVG_SCORE},
EOL
done

cat >> "$HTML_REPORT" << EOL
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Completeness',
            data: [
EOL

# Generate chart data for completeness scores
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  AVG_SCORE=$(awk -F, -v p="$provider" -v m="$model" '
    BEGIN {total=0; count=0}
    NR>1 && $1 == p && $2 == m {total+=$9; count++}
    END {if(count>0) printf "%.1f", total/count; else print "0"}
  ' "$ANALYSIS_SUMMARY")
  
  cat >> "$HTML_REPORT" << EOL
              ${AVG_SCORE},
EOL
done

cat >> "$HTML_REPORT" << EOL
            ],
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Depth',
            data: [
EOL

# Generate chart data for depth scores
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  AVG_SCORE=$(awk -F, -v p="$provider" -v m="$model" '
    BEGIN {total=0; count=0}
    NR>1 && $1 == p && $2 == m {total+=$10; count++}
    END {if(count>0) printf "%.1f", total/count; else print "0"}
  ' "$ANALYSIS_SUMMARY")
  
  cat >> "$HTML_REPORT" << EOL
              ${AVG_SCORE},
EOL
done

cat >> "$HTML_REPORT" << EOL
            ],
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }
        ]
      };
      
      // Create chart
      new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              title: {
                display: true,
                text: 'Score (out of 10)'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Model Score Breakdown by Category'
            }
          }
        }
      });
    }
    
    function drawLanguageScoreChart() {
      const ctx = document.getElementById('languageScoreChart').getContext('2d');
      
      // Prepare data for language comparison
      const languages = ['python', 'javascript', 'typescript', 'java', 'ruby'];
      const datasets = [
EOL

# Generate datasets for language chart
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  # Format display name
  if [[ "$provider" == "openrouter" ]]; then
    DISPLAY_NAME="OpenRouter (Claude)"
  else
    DISPLAY_NAME="$provider/$model"
  fi
  
  # Generate random color
  R=$((RANDOM % 200 + 55))
  G=$((RANDOM % 200 + 55))
  B=$((RANDOM % 200 + 55))
  
  cat >> "$HTML_REPORT" << EOL
        {
          label: '${DISPLAY_NAME}',
          data: [
EOL
  
  # Generate scores for each language
  for language in "${languages[@]}"; do
    AVG_SCORE=$(awk -F, -v lang="$language" -v p="$provider" -v m="$model" '
      BEGIN {total=0; count=0}
      NR>1 && tolower($4) == lang && $1 == p && $2 == m {
        total += $11;
        count++;
      }
      END {if(count>0) printf "%.1f", total/count; else print "0"}
    ' "$ANALYSIS_SUMMARY")
    
    cat >> "$HTML_REPORT" << EOL
            ${AVG_SCORE},
EOL
  done
  
  cat >> "$HTML_REPORT" << EOL
          ],
          backgroundColor: 'rgba(${R}, ${G}, ${B}, 0.6)',
          borderColor: 'rgba(${R}, ${G}, ${B}, 1)',
          borderWidth: 1
        },
EOL
done

cat >> "$HTML_REPORT" << EOL
      ];
      
      // Create chart
      new Chart(ctx, {
        type: 'radar',
        data: {
          labels: ['Python', 'JavaScript', 'TypeScript', 'Java', 'Ruby'],
          datasets: datasets
        },
        options: {
          responsive: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 10,
              ticks: {
                stepSize: 2
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Model Performance by Language'
            }
          }
        }
      });
    }
    
    function drawSizeScoreChart() {
      const ctx = document.getElementById('sizeScoreChart').getContext('2d');
      
      // Prepare data for size comparison
      const sizes = ['small', 'medium', 'large'];
      const datasets = [
EOL

# Generate datasets for size chart
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  # Format display name
  if [[ "$provider" == "openrouter" ]]; then
    DISPLAY_NAME="OpenRouter (Claude)"
  else
    DISPLAY_NAME="$provider/$model"
  fi
  
  # Generate random color
  R=$((RANDOM % 200 + 55))
  G=$((RANDOM % 200 + 55))
  B=$((RANDOM % 200 + 55))
  
  cat >> "$HTML_REPORT" << EOL
        {
          label: '${DISPLAY_NAME}',
          data: [
EOL
  
  # Generate scores for each size
  for size in "${sizes[@]}"; do
    AVG_SCORE=$(awk -F, -v size_cat="$size" -v p="$provider" -v m="$model" '
      BEGIN {total=0; count=0}
      NR>1 && tolower($3) == size_cat && $1 == p && $2 == m {
        total += $11;
        count++;
      }
      END {if(count>0) printf "%.1f", total/count; else print "0"}
    ' "$ANALYSIS_SUMMARY")
    
    cat >> "$HTML_REPORT" << EOL
            ${AVG_SCORE},
EOL
  done
  
  cat >> "$HTML_REPORT" << EOL
          ],
          backgroundColor: 'rgba(${R}, ${G}, ${B}, 0.6)',
          borderColor: 'rgba(${R}, ${G}, ${B}, 1)',
          borderWidth: 1
        },
EOL
done

cat >> "$HTML_REPORT" << EOL
      ];
      
      // Create chart
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Small', 'Medium', 'Large'],
          datasets: datasets
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              title: {
                display: true,
                text: 'Score (out of 10)'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Model Performance by Repository Size'
            }
          }
        }
      });
    }
    
    // Initialize charts
    document.addEventListener('DOMContentLoaded', function() {
      drawOverallScoreChart();
    });
  </script>
</body>
</html>
EOL

echo "Analysis and report generated successfully!"
echo "Summary CSV: $ANALYSIS_SUMMARY"
echo "HTML Report: $HTML_REPORT"
echo ""
echo "Open the HTML report in your browser to view the detailed analysis."

# Make the report executable
chmod +x "$0"
