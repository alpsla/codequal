FROM perl:5.38-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cpanminus \
    && rm -rf /var/lib/apt/lists/*

# Install Perl::Critic and related tools via cpanm (more reliable than direct install)
RUN cpanm --notest \
    Perl::Critic \
    Perl::Critic::Policy::Bangs \
    Perl::Critic::Policy::Compatibility \
    Perl::Critic::Policy::Lax \
    Perl::Critic::Policy::More \
    Perl::Critic::Policy::Pulp \
    Perl::Critic::Policy::Swift \
    Perl::Tidy \
    Test::Perl::Critic \
    B::Keywords \
    Config::Tiny \
    Email::Address \
    Exception::Class \
    File::HomeDir \
    File::Which \
    IO::String \
    List::MoreUtils \
    Module::Build \
    Module::Pluggable \
    PPI \
    PPIx::Regexp \
    PPIx::Utilities \
    Readonly \
    String::Format \
    Task::Weaken \
    && rm -rf /root/.cpanm/work

# Create a default .perlcriticrc configuration
RUN echo '# Default Perl::Critic configuration\n\
severity = 3\n\
verbose = 8\n\
\n\
# Security-related policies\n\
[InputOutput::RequireCheckedSyscalls]\n\
severity = 5\n\
\n\
[InputOutput::ProhibitBacktickOperators]\n\
severity = 4\n\
\n\
[BuiltinFunctions::ProhibitStringyEval]\n\
severity = 5\n\
\n\
[InputOutput::ProhibitTwoArgOpen]\n\
severity = 4\n\
\n\
# Code quality policies\n\
[TestingAndDebugging::RequireUseStrict]\n\
severity = 5\n\
\n\
[TestingAndDebugging::RequireUseWarnings]\n\
severity = 4\n\
\n\
[Variables::ProhibitUnusedVariables]\n\
severity = 3\n\
\n\
[Subroutines::ProhibitUnusedPrivateSubroutines]\n\
severity = 3\n\
\n\
# Exclude some overly strict policies\n\
[-CodeLayout::ProhibitParensWithBuiltins]\n\
[-ValuesAndExpressions::ProhibitEmptyQuotes]\n\
[-Documentation::RequirePodSections]' > /etc/.perlcriticrc

# Create a default .perltidyrc
RUN echo '# Default Perl::Tidy configuration\n\
-l=100   # Max line width\n\
-i=4     # Indent level\n\
-ci=4    # Continuation indent\n\
-vt=2    # Vertical tightness\n\
-cti=0   # Closing token indentation\n\
-pt=1    # Paren tightness\n\
-bt=1    # Brace tightness\n\
-sbt=1   # Square bracket tightness\n\
-bbt=1   # Block brace tightness\n\
-nsfs    # No space before semicolons\n\
-nolq    # No outdenting long quotes\n\
-wbb="% + - * / x != == >= <= =~ !~ < > | & = **= += *= &= <<= &&= -= /= |= >>= ||= //= .= %= ^= x="\n\
' > /etc/.perltidyrc

WORKDIR /workspace

CMD ["/bin/bash"]