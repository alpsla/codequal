FROM gcc:12

# Install additional C++ analysis tools
RUN apt-get update && apt-get install -y \
    cppcheck \
    clang \
    clang-tidy \
    clang-format \
    cmake \
    valgrind \
    iwyu \
    && rm -rf /var/lib/apt/lists/*

# Install cpplint
RUN apt-get update && apt-get install -y python3-pip \
    && pip3 install cpplint \
    && rm -rf /var/lib/apt/lists/*

# Create default .clang-tidy configuration
RUN echo "---\n\
Checks: '\n\
  -*,\n\
  bugprone-*,\n\
  cert-*,\n\
  clang-analyzer-*,\n\
  cppcoreguidelines-*,\n\
  misc-*,\n\
  modernize-*,\n\
  performance-*,\n\
  portability-*,\n\
  readability-*,\n\
  -modernize-use-trailing-return-type,\n\
  -readability-magic-numbers,\n\
  -cppcoreguidelines-avoid-magic-numbers\n\
'\n\
WarningsAsErrors: ''\n\
HeaderFilterRegex: '.*'\n\
AnalyzeTemporaryDtors: false\n\
FormatStyle: google" > /etc/.clang-tidy

# Create default .clang-format
RUN echo "---\n\
BasedOnStyle: Google\n\
IndentWidth: 4\n\
ColumnLimit: 100\n\
AllowShortFunctionsOnASingleLine: None\n\
AllowShortIfStatementsOnASingleLine: false\n\
AllowShortLoopsOnASingleLine: false" > /etc/.clang-format

WORKDIR /workspace

CMD ["/bin/bash"]