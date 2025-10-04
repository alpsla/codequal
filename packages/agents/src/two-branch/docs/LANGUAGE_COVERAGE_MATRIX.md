# Language Coverage Matrix
**Last Updated**: October 3, 2025
**Status**: OWASP Dependency-Check Multi-Language Support Confirmed ✅

## Current Tool Coverage by Language (V9 Production)

| Language | Security | Code Quality | Type Check | Dependencies | Status |
|----------|----------|--------------|------------|--------------|--------|
| **Java** | ✅ Semgrep<br>✅ SpotBugs | ✅ PMD<br>✅ Checkstyle | ❌ | ✅ **Dependency-Check** | **🟢 PRODUCTION** |
| **JavaScript** | ✅ Semgrep<br>✅ ESLint | ✅ ESLint<br>✅ JSHint | ❌ | ✅ npm audit<br>✅ **Dependency-Check** | **🟢 FULL** |
| **TypeScript** | ✅ Semgrep<br>✅ ESLint | ✅ ESLint | ✅ TSC | ✅ npm audit<br>✅ **Dependency-Check** | **🟢 FULL** |
| **Python** | ✅ Bandit<br>✅ Semgrep | ✅ Pylint | ✅ MyPy | ✅ Safety<br>✅ pip-audit<br>✅ **Dependency-Check** | **🟢 FULL** |
| **Go** | ✅ Semgrep<br>✅ gosec | ✅ golangci-lint | ❌ | ✅ go mod<br>✅ **Dependency-Check** | **🟢 FULL** |
| **C/C++** | ✅ Semgrep<br>✅ Cppcheck | ✅ Cppcheck | ✅ Cppcheck | ✅ **Dependency-Check** | **🟡 GOOD** |
| **C#** | ✅ Semgrep<br>✅ Roslyn | ✅ Roslyn | ❌ | ✅ **Dependency-Check** (NuGet) | **🟡 GOOD** |
| **Ruby** | ✅ Semgrep | ✅ RuboCop | ❌ | ✅ bundler-audit<br>✅ **Dependency-Check** | **🟡 GOOD** |
| **PHP** | ✅ Semgrep | ✅ PHPCS | ❌ | ✅ **Dependency-Check** (Composer) | **🟡 GOOD** |
| **Rust** | ✅ Semgrep<br>✅ Custom | ✅ Clippy | ❌ | ✅ **Dependency-Check** (Cargo) | **🟡 GOOD** |
| **Swift** | ✅ Semgrep | ❌ | ❌ | ✅ **Dependency-Check** (CocoaPods) | **🟠 PARTIAL** |
| **Kotlin** | ✅ Semgrep | ❌ | ❌ | ✅ **Dependency-Check** (Gradle) | **🟠 PARTIAL** |

## 🎯 OWASP Dependency-Check Multi-Language Support

**CRITICAL DISCOVERY**: Dependency-Check provides CVE scanning for **ALL 12 languages**!

### Supported Package Managers:
- **Java**: Maven (pom.xml), Gradle (build.gradle)
- **JavaScript/Node.js**: npm (package.json), yarn (yarn.lock)
- **Python**: pip (requirements.txt), Pipfile (Pipfile.lock)
- **Ruby**: Bundler (Gemfile.lock)
- **PHP**: Composer (composer.lock)
- **.NET/C#**: NuGet (packages.config, *.csproj)
- **Go**: go.mod
- **Rust**: Cargo.lock
- **Swift**: CocoaPods, Carthage, Swift Package Manager
- **C/C++**: Autoconf, CMake (limited)

### V9 Integration Status:
- ✅ Oracle Cloud PostgreSQL with 208K+ CVEs cached
- ✅ Automatic multi-language detection
- ✅ < 5 second scan time per project
- ✅ Daily CVE database updates (2 AM UTC)

## Language Support Tiers (UPDATED)

### Tier 1: Production Ready (5 languages) 🟢
1. **Java** - SpotBugs, PMD, Checkstyle, Semgrep, Dependency-Check
2. **Python** - Bandit, Pylint, MyPy, Safety, pip-audit, Semgrep, Dependency-Check
3. **JavaScript** - ESLint, JSHint, npm audit, Semgrep, Dependency-Check
4. **TypeScript** - ESLint, TSC, npm audit, Semgrep, Dependency-Check
5. **Go** - gosec, golangci-lint, go mod, Semgrep, Dependency-Check

### Tier 2: Good Support (5 languages) 🟡
6. **C/C++** - Cppcheck (all categories), Semgrep, Dependency-Check
7. **C#** - Roslyn (all categories), Semgrep, Dependency-Check
8. **Ruby** - RuboCop, bundler-audit, Semgrep, Dependency-Check
9. **PHP** - PHPCS, Semgrep, Dependency-Check
10. **Rust** - Clippy, Custom scanner, Semgrep, Dependency-Check

### Tier 3: Basic Support (2 languages) 🟠
11. **Swift** - Semgrep, Dependency-Check only
12. **Kotlin** - Semgrep, Dependency-Check only

## Critical Gaps to Fill

### Priority 1: Java (High demand)
**Tools to add:**
- SpotBugs (security/quality)
- Checkstyle (code quality)
- PMD (code quality)
- OWASP Dependency Check

### Priority 2: Go (Growing demand)
**Tools to add:**
- gosec (security)
- golangci-lint (quality)
- go vet (built-in)
- go mod audit (dependencies)

### Priority 3: Ruby (Rails community)
**Tools to add:**
- Brakeman (security)
- RuboCop (quality)
- bundler-audit (dependencies)

### Priority 4: PHP (WordPress/Laravel)
**Tools to add:**
- Psalm/PHPStan (type checking)
- PHP_CodeSniffer (quality)
- PHP Security Checker

## Installation Commands for Gap Closure

```bash
# Java tools
apt-get install -y default-jdk maven
wget https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.tgz
npm install -g @owasp/dependency-check

# Go tools
snap install go --classic
go install github.com/securego/gosec/v2/cmd/gosec@latest
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b /usr/local/bin

# Ruby tools
apt-get install -y ruby-full
gem install brakeman rubocop bundler-audit

# PHP tools
apt-get install -y php php-xml php-mbstring composer
composer global require vimeo/psalm phpstan/phpstan squizlabs/php_codesniffer

# .NET tools
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh
dotnet tool install --global security-scan

# Rust tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install cargo-audit cargo-clippy

# Swift (on Linux)
wget https://swift.org/builds/swift-5.9-release/ubuntu2204/swift-5.9-RELEASE/swift-5.9-RELEASE-ubuntu22.04.tar.gz
tar xzf swift-5.9-RELEASE-ubuntu22.04.tar.gz
# SwiftLint requires more complex setup
```

## Market Analysis

### Most Popular Languages (GitHub 2024)
1. JavaScript/TypeScript - ✅ Full support
2. Python - ✅ Full support
3. Java - ❌ Major gaps
4. Go - ❌ Major gaps
5. C++ - ⚠️ Good support
6. Ruby - ❌ Major gaps
7. PHP - ❌ Major gaps
8. C# - ❌ Major gaps
9. C - ⚠️ Good support
10. Rust - ❌ Major gaps

### Revenue Potential by Language
- **Enterprise (High $$$)**: Java, C#, Go
- **Startup (Medium $$)**: JavaScript, Python, Ruby
- **Open Source (Low $)**: All languages

## Recommended Roadmap

### Phase 1: MVP (Current)
✅ JavaScript/TypeScript
✅ Python
✅ Multi-language security (Semgrep)

### Phase 2: Enterprise Languages (Q1 2025)
- Add Java complete toolchain
- Add Go complete toolchain
- Add C# complete toolchain

### Phase 3: Full Stack (Q2 2025)
- Add Ruby toolchain
- Add PHP toolchain
- Add Rust toolchain

### Phase 4: Mobile (Q3 2025)
- Add Swift toolchain
- Add Kotlin toolchain
- Add Dart/Flutter support

## API Service Language Detection

```typescript
interface LanguageDetection {
  detectLanguages(repoPath: string): Promise<{
    primary: string;
    languages: Array<{
      name: string;
      percentage: number;
      supportTier: 1 | 2 | 3;
      availableTools: string[];
    }>;
  }>;
}

// Use GitHub Linguist or custom detection
// Route to appropriate tools based on language
```

## Business Model Implications

### Pricing Tiers by Language Support
1. **Starter**: JavaScript, TypeScript, Python only
2. **Professional**: + Java, Go, C/C++
3. **Enterprise**: All languages + custom tools

### Market Positioning
- **Current**: Strong for web development
- **Gap**: Enterprise languages (Java, C#)
- **Opportunity**: Be first with comprehensive Rust/Swift support

Last update for matrix 09_06_25:

  | Language   | Security         | Dependencies     | Quality       | Performance | Architecture |
  |------------|------------------|------------------|---------------|-------------|--------------|
  | Python     | Bandit, safety   | pip-audit        | Pylint        | -           | -            |
  | JavaScript | ESLint plugins   | npm audit        | ESLint        | -           | -            |
  | Java       | SpotBugs         | dependency-check | PMD           | PMD         | PMD patterns |
  | Go         | gosec            | go mod           | golangci-lint | golangci    | -            |
  | TypeScript | ESLint           | npm audit        | TSC           | -           | -            |
  | Ruby       | -                | -                | RuboCop       | -           | -            |
  | PHP        | -                | -                | PHPCS         | -           | -            |
  | C++        | -                | -                | Cppcheck      | Cppcheck    | -            |
  | C#         | Roslyn           | -                | Roslyn        | Roslyn      | Roslyn       |
  | Perl       | -                | -                | Perl::Critic  | -           | -            |
  | Rust       | ✅ Custom scanner | -                | Clippy        | Clippy      | -            |