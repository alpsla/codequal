FROM ruby:3.2-slim

# Install development tools
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Ruby analysis tools
RUN gem install \
    brakeman \
    rubocop \
    rubocop-performance \
    rubocop-rails \
    reek \
    rails_best_practices \
    bundler-audit \
    && gem cleanup

# Create a default RuboCop configuration
RUN echo 'AllCops:\n\
  NewCops: enable\n\
  TargetRubyVersion: 3.2\n\
  Exclude:\n\
    - "vendor/**/*"\n\
    - "db/**/*"\n\
    - "config/**/*"\n\
    - "bin/**/*"\n\
    - "node_modules/**/*"\n\
\n\
Style/Documentation:\n\
  Enabled: false\n\
\n\
Style/StringLiterals:\n\
  EnforcedStyle: double_quotes\n\
\n\
Metrics/MethodLength:\n\
  Max: 20\n\
\n\
Metrics/ClassLength:\n\
  Max: 200\n\
\n\
Metrics/BlockLength:\n\
  Exclude:\n\
    - "spec/**/*"\n\
    - "test/**/*"\n\
\n\
Layout/LineLength:\n\
  Max: 120\n\
\n\
Security/Eval:\n\
  Enabled: true\n\
\n\
Security/Open:\n\
  Enabled: true' > /etc/.rubocop.yml

# Set default config location
ENV RUBOCOP_CONFIG=/etc/.rubocop.yml

WORKDIR /workspace

CMD ["/bin/bash"]