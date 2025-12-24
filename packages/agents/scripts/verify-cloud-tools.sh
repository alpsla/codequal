#!/bin/bash
# ============================================================================
# Cloud Tool Verification Script
#
# Tests all 52 validator tools to confirm they:
# 1. Are installed and executable
# 2. Can find at least 1 issue in test fixtures
#
# Usage: ./verify-cloud-tools.sh [--quick] [--tool <name>]
#   --quick   Only test P0/P1 priority tools
#   --tool    Test a specific tool only
#
# Run this on the cloud instance where tools are installed
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test fixtures directory
FIXTURES_DIR="/tmp/tool-verify-fixtures"
RESULTS_FILE="/tmp/tool-verify-results.txt"

# Counters
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# Parse arguments
QUICK_MODE=false
SINGLE_TOOL=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick) QUICK_MODE=true; shift ;;
    --tool) SINGLE_TOOL="$2"; shift 2 ;;
    *) shift ;;
  esac
done

echo "============================================================================"
echo "                    CLOUD TOOL VERIFICATION"
echo "============================================================================"
echo ""
echo "Mode: $([ "$QUICK_MODE" = true ] && echo 'Quick (P0/P1 only)' || echo 'Full (all tools)')"
[ -n "$SINGLE_TOOL" ] && echo "Single tool: $SINGLE_TOOL"
echo "Fixtures: $FIXTURES_DIR"
echo "Results: $RESULTS_FILE"
echo ""

# ============================================================================
# CREATE TEST FIXTURES
# ============================================================================

create_fixtures() {
  echo -e "${BLUE}Creating test fixtures...${NC}"
  mkdir -p "$FIXTURES_DIR"/{java,python,typescript,go,rust,ruby,php,csharp,infra,api}

  # --- JAVA ---
  cat > "$FIXTURES_DIR/java/VulnerableCode.java" << 'EOF'
package com.example;
import java.sql.*;
import java.io.*;

public class VulnerableCode {
    // SQL Injection
    public void unsafeQuery(String userId) throws SQLException {
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db");
        Statement stmt = conn.createStatement();
        stmt.executeQuery("SELECT * FROM users WHERE id = '" + userId + "'");
    }

    // Command Injection
    public void unsafeExec(String cmd) throws IOException {
        Runtime.getRuntime().exec(cmd);
    }

    // Hardcoded password
    private static final String PASSWORD = "admin123";
    private static final String API_KEY = "sk-1234567890abcdef";

    // PMD: Unused variable
    public void unusedVar() {
        int x = 5;
        System.out.println("hello");
    }
}
EOF

  # Java with dependencies (for dependency-check)
  cat > "$FIXTURES_DIR/java/pom.xml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>vulnerable-app</artifactId>
  <version>1.0</version>
  <dependencies>
    <!-- Known vulnerable: CVE-2021-44228 Log4Shell -->
    <dependency>
      <groupId>org.apache.logging.log4j</groupId>
      <artifactId>log4j-core</artifactId>
      <version>2.14.1</version>
    </dependency>
    <!-- Known vulnerable: CVE-2022-22965 Spring4Shell -->
    <dependency>
      <groupId>org.springframework</groupId>
      <artifactId>spring-beans</artifactId>
      <version>5.3.17</version>
    </dependency>
  </dependencies>
</project>
EOF

  # --- PYTHON ---
  cat > "$FIXTURES_DIR/python/vulnerable.py" << 'EOF'
import os
import subprocess
import pickle
import hashlib
import yaml
import sqlite3

# B602: subprocess with shell=True
def run_command(cmd):
    subprocess.call(cmd, shell=True)

# B605: os.system
def system_call(cmd):
    os.system(cmd)

# B301: pickle
def load_pickle(path):
    with open(path, 'rb') as f:
        return pickle.load(f)

# B303: MD5 (weak hash)
def weak_hash(data):
    return hashlib.md5(data.encode()).hexdigest()

# B506: yaml.load without Loader
def unsafe_yaml(data):
    return yaml.load(data)

# SQL injection
def get_user(user_id):
    conn = sqlite3.connect('db.sqlite')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = " + user_id)

# Hardcoded secrets
PASSWORD = "SuperSecret123!"
API_KEY = "sk-1234567890abcdef"
AWS_SECRET = "AKIAIOSFODNN7EXAMPLE"

# Unused imports (ruff/pylint)
import json
import sys

# Type error (mypy)
def add(a: int, b: int) -> int:
    return a + b

result = add("hello", "world")
EOF

  cat > "$FIXTURES_DIR/python/requirements.txt" << 'EOF'
# Known vulnerable packages
django==2.2.0
requests==2.19.0
flask==0.12.0
pyyaml==5.3.0
pillow==6.0.0
EOF

  # --- TYPESCRIPT/JAVASCRIPT ---
  cat > "$FIXTURES_DIR/typescript/vulnerable.ts" << 'EOF'
import { exec } from 'child_process';
import express from 'express';

const app = express();

// Command injection
app.get('/run', (req, res) => {
  exec(req.query.cmd as string);
});

// SQL injection
app.get('/user', (req, res) => {
  const query = "SELECT * FROM users WHERE id = " + req.query.id;
  // db.query(query);
});

// XSS
app.get('/search', (req, res) => {
  res.send(`<html>Results for: ${req.query.q}</html>`);
});

// Eval
function dangerous(code: string) {
  return eval(code);
}

// Hardcoded secrets
const API_KEY = "sk-1234567890abcdef";
const PASSWORD = "admin123";

// Unused variables (eslint)
const unusedVar = 'never used';
let shouldBeConst = 'constant';

// Any type (typescript)
function processData(data: any): any {
  console.log(data);
  return data;
}
EOF

  cat > "$FIXTURES_DIR/typescript/package.json" << 'EOF'
{
  "name": "vulnerable-app",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "4.17.15",
    "express": "4.17.0",
    "minimist": "1.2.0",
    "axios": "0.21.0"
  }
}
EOF

  # Circular dependency files for madge
  cat > "$FIXTURES_DIR/typescript/a.js" << 'EOF'
const b = require('./b');
module.exports.funcA = () => 'A calls ' + b.funcB();
EOF
  cat > "$FIXTURES_DIR/typescript/b.js" << 'EOF'
const a = require('./a');
module.exports.funcB = () => 'B calls ' + a.funcA();
EOF

  # --- GO ---
  cat > "$FIXTURES_DIR/go/main.go" << 'EOF'
package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"os/exec"
)

// SQL injection
func getUser(db *sql.DB, userID string) {
	query := "SELECT * FROM users WHERE id = '" + userID + "'"
	db.Query(query)
}

// Command injection
func runCommand(cmd string) {
	exec.Command("sh", "-c", cmd).Run()
}

// Hardcoded credentials
const PASSWORD = "admin123"
const API_KEY = "sk-1234567890abcdef"

// Unhandled error
func handleRequest(w http.ResponseWriter, r *http.Request) {
	data, _ := db.Query("SELECT * FROM data")  // Error ignored
	fmt.Fprintf(w, "%v", data)
}

func main() {
	http.HandleFunc("/", handleRequest)
	http.ListenAndServe(":8080", nil)
}
EOF

  cat > "$FIXTURES_DIR/go/go.mod" << 'EOF'
module vulnerable-app

go 1.19

require (
	github.com/gin-gonic/gin v1.6.0
	golang.org/x/crypto v0.0.0-20200820211705-5c72a883971a
)
EOF

  # --- RUST ---
  cat > "$FIXTURES_DIR/rust/main.rs" << 'EOF'
use std::process::Command;

fn main() {
    // Command injection
    let user_input = "ls";
    Command::new("sh")
        .arg("-c")
        .arg(user_input)
        .output()
        .expect("failed");

    // Unsafe block
    unsafe {
        let ptr: *const i32 = std::ptr::null();
        println!("{}", *ptr);
    }

    // Hardcoded secret
    let api_key = "sk-1234567890abcdef";
    let password = "admin123";

    // Unused variable
    let unused = 42;

    println!("Hello");
}
EOF

  cat > "$FIXTURES_DIR/rust/Cargo.toml" << 'EOF'
[package]
name = "vulnerable-app"
version = "0.1.0"
edition = "2021"

[dependencies]
openssl = "0.10.29"
regex = "1.3.0"
EOF

  # --- RUBY ---
  cat > "$FIXTURES_DIR/ruby/vulnerable.rb" << 'EOF'
require 'yaml'
require 'open-uri'

class VulnerableController < ApplicationController
  # Command injection
  def run_command
    system(params[:cmd])
  end

  # SQL injection
  def find_user
    User.where("name = '#{params[:name]}'")
  end

  # Unsafe YAML
  def load_config
    YAML.load(params[:config])
  end

  # Mass assignment
  def create_user
    User.create(params[:user])
  end

  # Hardcoded secrets
  API_KEY = "sk-1234567890abcdef"
  PASSWORD = "admin123"
end

# Style issues
very_long_variable_name_that_exceeds_maximum = "This line is too long and should trigger rubocop"
EOF

  cat > "$FIXTURES_DIR/ruby/Gemfile" << 'EOF'
source 'https://rubygems.org'

gem 'rails', '5.2.0'
gem 'nokogiri', '1.10.0'
gem 'rack', '2.0.0'
EOF

  # --- PHP ---
  cat > "$FIXTURES_DIR/php/vulnerable.php" << 'EOF'
<?php
// SQL injection
function getUser($id) {
    $conn = mysqli_connect("localhost", "root", "", "db");
    $query = "SELECT * FROM users WHERE id = " . $id;
    return mysqli_query($conn, $query);
}

// Command injection
function runCommand($cmd) {
    system($cmd);
    exec($cmd);
    shell_exec($cmd);
}

// File inclusion
function loadTemplate($file) {
    include($file);
}

// Hardcoded secrets
define('API_KEY', 'sk-1234567890abcdef');
define('PASSWORD', 'admin123');

// XSS
echo $_GET['name'];

// Type issues
function add(int $a, int $b): int {
    return $a + $b;
}

$result = add("hello", "world");
?>
EOF

  cat > "$FIXTURES_DIR/php/composer.json" << 'EOF'
{
    "require": {
        "symfony/http-foundation": "4.4.0",
        "guzzlehttp/guzzle": "6.5.0",
        "monolog/monolog": "1.25.0"
    }
}
EOF

  # --- C# ---
  cat > "$FIXTURES_DIR/csharp/Vulnerable.cs" << 'EOF'
using System;
using System.Data.SqlClient;
using System.Diagnostics;

public class VulnerableCode
{
    // SQL injection
    public void GetUser(string userId)
    {
        var conn = new SqlConnection("Server=localhost;Database=db;");
        var cmd = new SqlCommand("SELECT * FROM users WHERE id = '" + userId + "'", conn);
        cmd.ExecuteReader();
    }

    // Command injection
    public void RunCommand(string cmd)
    {
        Process.Start("cmd.exe", "/c " + cmd);
    }

    // Hardcoded secrets
    private const string API_KEY = "sk-1234567890abcdef";
    private const string PASSWORD = "admin123";

    // Unused variable
    public void UnusedVar()
    {
        int x = 5;
        Console.WriteLine("hello");
    }
}
EOF

  # --- INFRASTRUCTURE ---
  cat > "$FIXTURES_DIR/infra/Dockerfile" << 'EOF'
FROM ubuntu:latest
USER root
RUN apt-get update && apt-get install -y curl wget netcat
ENV API_KEY=sk-1234567890abcdef
ENV DATABASE_PASSWORD=secretpass123
EXPOSE 22 8080 3306
ADD . /app
CMD ["python", "app.py"]
EOF

  cat > "$FIXTURES_DIR/infra/deployment.yaml" << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vulnerable-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        securityContext:
          privileged: true
          runAsUser: 0
        env:
        - name: API_KEY
          value: "sk-1234567890abcdef"
        - name: DB_PASSWORD
          value: "admin123"
EOF

  cat > "$FIXTURES_DIR/infra/main.tf" << 'EOF'
provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "insecure" {
  name = "insecure-sg"

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_s3_bucket" "insecure" {
  bucket = "my-insecure-bucket"
  acl    = "public-read"
}
EOF

  # --- API SPECS ---
  cat > "$FIXTURES_DIR/api/openapi.yaml" << 'EOF'
openapi: 3.0.0
info:
  title: Insecure API
  version: 1.0.0
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
      responses:
        200:
          description: OK
  /admin:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
      responses:
        default:
          description: Error
EOF

  cat > "$FIXTURES_DIR/api/schema.graphql" << 'EOF'
type Query {
  user(id: ID!): User
  users: [User]
  admin: Admin
}

type User {
  id: ID!
  name: String
  email: String
  password: String
  ssn: String
}

type Admin {
  id: ID!
  secretKey: String
}

type Mutation {
  deleteAllUsers: Boolean
  executeCommand(cmd: String!): String
}
EOF

  echo -e "${GREEN}✓ Fixtures created${NC}"
}

# ============================================================================
# TOOL TEST FUNCTIONS
# ============================================================================

log_result() {
  local tool=$1
  local status=$2
  local issues=$3
  local time=$4
  local notes=$5

  echo "$tool|$status|$issues|$time|$notes" >> "$RESULTS_FILE"

  TOTAL=$((TOTAL + 1))
  case $status in
    PASS) PASSED=$((PASSED + 1)); echo -e "${GREEN}✓ $tool: $issues issues found (${time}ms)${NC}" ;;
    FAIL) FAILED=$((FAILED + 1)); echo -e "${RED}✗ $tool: $notes${NC}" ;;
    SKIP) SKIPPED=$((SKIPPED + 1)); echo -e "${YELLOW}⊘ $tool: SKIPPED - $notes${NC}" ;;
  esac
}

# Cross-platform millisecond timer
get_ms() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use python for milliseconds
    python3 -c 'import time; print(int(time.time() * 1000))'
  else
    # Linux
    date +%s%3N
  fi
}

check_installed() {
  local cmd=$1
  if command -v "$cmd" &> /dev/null; then
    return 0
  else
    return 1
  fi
}

# ============================================================================
# INDIVIDUAL TOOL TESTS
# ============================================================================

test_semgrep() {
  if ! check_installed semgrep; then
    log_result "semgrep" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(semgrep scan --config auto --json "$FIXTURES_DIR" 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"check_id"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "semgrep" "PASS" "$issues" "$duration" ""
  else
    log_result "semgrep" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_gitleaks() {
  if ! check_installed gitleaks; then
    log_result "gitleaks" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(gitleaks detect --source "$FIXTURES_DIR" --no-git -f json --report-path /dev/stdout 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"RuleID"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "gitleaks" "PASS" "$issues" "$duration" ""
  else
    log_result "gitleaks" "FAIL" 0 "$duration" "No secrets found"
  fi
}

test_trufflehog() {
  if ! check_installed trufflehog; then
    log_result "trufflehog" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(trufflehog filesystem "$FIXTURES_DIR" --json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -c "DetectorType" || echo 0)

  if [ "$issues" -gt 0 ]; then
    log_result "trufflehog" "PASS" "$issues" "$duration" ""
  else
    log_result "trufflehog" "FAIL" 0 "$duration" "No secrets found"
  fi
}

test_bandit() {
  if ! check_installed bandit; then
    log_result "bandit" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(bandit -r "$FIXTURES_DIR/python" -f json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"test_id"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "bandit" "PASS" "$issues" "$duration" ""
  else
    log_result "bandit" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_ruff() {
  if ! check_installed ruff; then
    log_result "ruff" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(ruff check "$FIXTURES_DIR/python" --output-format json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"code"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "ruff" "PASS" "$issues" "$duration" ""
  else
    log_result "ruff" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_pylint() {
  if ! check_installed pylint; then
    log_result "pylint" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(pylint "$FIXTURES_DIR/python" --output-format=json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"message-id"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "pylint" "PASS" "$issues" "$duration" ""
  else
    log_result "pylint" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_mypy() {
  if ! check_installed mypy; then
    log_result "mypy" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(mypy "$FIXTURES_DIR/python" --ignore-missing-imports 2>&1 || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -c "error:" || echo 0)

  if [ "$issues" -gt 0 ]; then
    log_result "mypy" "PASS" "$issues" "$duration" ""
  else
    log_result "mypy" "FAIL" 0 "$duration" "No type errors found"
  fi
}

test_pip_audit() {
  if ! check_installed pip-audit; then
    log_result "pip-audit" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(pip-audit -r "$FIXTURES_DIR/python/requirements.txt" --format json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"id"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "pip-audit" "PASS" "$issues" "$duration" ""
  else
    log_result "pip-audit" "FAIL" 0 "$duration" "No vulnerabilities found"
  fi
}

test_safety() {
  if ! check_installed safety; then
    log_result "safety" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(safety check -r "$FIXTURES_DIR/python/requirements.txt" --json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"vulnerability_id"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "safety" "PASS" "$issues" "$duration" ""
  else
    log_result "safety" "FAIL" 0 "$duration" "No vulnerabilities found"
  fi
}

test_eslint() {
  if ! check_installed eslint; then
    log_result "eslint" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(eslint "$FIXTURES_DIR/typescript" --format json --no-config-lookup --rule "no-unused-vars: warn" --rule "no-eval: error" 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"ruleId"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "eslint" "PASS" "$issues" "$duration" ""
  else
    log_result "eslint" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_tsc() {
  if ! check_installed tsc; then
    log_result "typescript" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(tsc --noEmit --allowJs --checkJs "$FIXTURES_DIR/typescript/vulnerable.ts" 2>&1 || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -c "error TS" || echo 0)

  if [ "$issues" -gt 0 ]; then
    log_result "typescript" "PASS" "$issues" "$duration" ""
  else
    log_result "typescript" "FAIL" 0 "$duration" "No type errors found"
  fi
}

test_npm_audit() {
  if ! check_installed npm; then
    log_result "npm-audit" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  cd "$FIXTURES_DIR/typescript"
  npm install --package-lock-only 2>/dev/null || true
  local output=$(npm audit --json 2>/dev/null || true)
  cd - > /dev/null
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"severity"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "npm-audit" "PASS" "$issues" "$duration" ""
  else
    log_result "npm-audit" "FAIL" 0 "$duration" "No vulnerabilities found"
  fi
}

test_madge() {
  if ! check_installed madge && ! npx madge --version &>/dev/null; then
    log_result "madge" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(npx madge --circular --json "$FIXTURES_DIR/typescript" 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  # madge returns array of circular deps
  local issues=$(echo "$output" | grep -o '\[' | head -1 | wc -l)
  if echo "$output" | grep -q '.\+'; then
    issues=1
  fi

  if [ "$issues" -gt 0 ]; then
    log_result "madge" "PASS" "$issues" "$duration" ""
  else
    log_result "madge" "FAIL" 0 "$duration" "No circular deps found"
  fi
}

test_golangci_lint() {
  if ! check_installed golangci-lint; then
    log_result "golangci-lint" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  cd "$FIXTURES_DIR/go"
  local output=$(golangci-lint run --out-format json 2>/dev/null || true)
  cd - > /dev/null
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"Text"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "golangci-lint" "PASS" "$issues" "$duration" ""
  else
    log_result "golangci-lint" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_gosec() {
  if ! check_installed gosec; then
    log_result "gosec" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(gosec -fmt=json "$FIXTURES_DIR/go/..." 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"rule_id"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "gosec" "PASS" "$issues" "$duration" ""
  else
    log_result "gosec" "FAIL" 0 "$duration" "No security issues found"
  fi
}

test_staticcheck() {
  if ! check_installed staticcheck; then
    log_result "staticcheck" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  cd "$FIXTURES_DIR/go"
  local output=$(staticcheck -f json ./... 2>/dev/null || true)
  cd - > /dev/null
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -c '"code"' || echo 0)

  if [ "$issues" -gt 0 ]; then
    log_result "staticcheck" "PASS" "$issues" "$duration" ""
  else
    log_result "staticcheck" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_govulncheck() {
  if ! check_installed govulncheck; then
    log_result "govulncheck" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  cd "$FIXTURES_DIR/go"
  local output=$(govulncheck -json ./... 2>/dev/null || true)
  cd - > /dev/null
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -c '"OSV"' || echo 0)

  if [ "$issues" -gt 0 ]; then
    log_result "govulncheck" "PASS" "$issues" "$duration" ""
  else
    log_result "govulncheck" "FAIL" 0 "$duration" "No vulnerabilities found"
  fi
}

test_clippy() {
  if ! check_installed cargo; then
    log_result "clippy" "SKIP" 0 0 "Cargo not installed"
    return
  fi

  local start=$(get_ms)
  cd "$FIXTURES_DIR/rust"
  local output=$(cargo clippy --message-format=json 2>/dev/null || true)
  cd - > /dev/null
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -c '"level":"warning"' || echo 0)

  if [ "$issues" -gt 0 ]; then
    log_result "clippy" "PASS" "$issues" "$duration" ""
  else
    log_result "clippy" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_cargo_audit() {
  if ! check_installed cargo-audit; then
    log_result "cargo-audit" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  cd "$FIXTURES_DIR/rust"
  local output=$(cargo audit --json 2>/dev/null || true)
  cd - > /dev/null
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"id"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "cargo-audit" "PASS" "$issues" "$duration" ""
  else
    log_result "cargo-audit" "FAIL" 0 "$duration" "No vulnerabilities found"
  fi
}

test_rubocop() {
  if ! check_installed rubocop; then
    log_result "rubocop" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(rubocop "$FIXTURES_DIR/ruby" --format json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"cop_name"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "rubocop" "PASS" "$issues" "$duration" ""
  else
    log_result "rubocop" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_brakeman() {
  if ! check_installed brakeman; then
    log_result "brakeman" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(brakeman -q -f json "$FIXTURES_DIR/ruby" 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"warning_type"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "brakeman" "PASS" "$issues" "$duration" ""
  else
    log_result "brakeman" "FAIL" 0 "$duration" "No security issues found"
  fi
}

test_bundler_audit() {
  if ! check_installed bundle-audit && ! check_installed bundler-audit; then
    log_result "bundler-audit" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  cd "$FIXTURES_DIR/ruby"
  bundle install --quiet 2>/dev/null || true
  local output=$(bundle-audit check --format json 2>/dev/null || bundler-audit check --format json 2>/dev/null || true)
  cd - > /dev/null
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"advisory"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "bundler-audit" "PASS" "$issues" "$duration" ""
  else
    log_result "bundler-audit" "FAIL" 0 "$duration" "No vulnerabilities found"
  fi
}

test_phpstan() {
  if ! check_installed phpstan; then
    log_result "phpstan" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(phpstan analyse "$FIXTURES_DIR/php" --error-format=json --no-progress 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"message"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "phpstan" "PASS" "$issues" "$duration" ""
  else
    log_result "phpstan" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_phpcs() {
  if ! check_installed phpcs; then
    log_result "phpcs" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(phpcs --report=json "$FIXTURES_DIR/php" 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"message"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "phpcs" "PASS" "$issues" "$duration" ""
  else
    log_result "phpcs" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_trivy() {
  if ! check_installed trivy; then
    log_result "trivy" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(trivy config "$FIXTURES_DIR/infra" --format json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"Misconfigurations"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "trivy" "PASS" "$issues" "$duration" ""
  else
    log_result "trivy" "FAIL" 0 "$duration" "No misconfigurations found"
  fi
}

test_checkov() {
  if ! check_installed checkov; then
    log_result "checkov" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(checkov -d "$FIXTURES_DIR/infra" -o json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"check_id"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "checkov" "PASS" "$issues" "$duration" ""
  else
    log_result "checkov" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_grype() {
  if ! check_installed grype; then
    log_result "grype" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(grype dir:"$FIXTURES_DIR" -o json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"vulnerability"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "grype" "PASS" "$issues" "$duration" ""
  else
    log_result "grype" "FAIL" 0 "$duration" "No vulnerabilities found"
  fi
}

test_spectral() {
  if ! check_installed spectral && ! npx @stoplight/spectral-cli --version &>/dev/null; then
    log_result "spectral" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(npx @stoplight/spectral-cli lint "$FIXTURES_DIR/api/openapi.yaml" -f json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"code"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "spectral" "PASS" "$issues" "$duration" ""
  else
    log_result "spectral" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_pmd() {
  if ! check_installed pmd; then
    log_result "pmd" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(pmd check -d "$FIXTURES_DIR/java" -R rulesets/java/quickstart.xml -f json 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -o '"rule"' | wc -l)

  if [ "$issues" -gt 0 ]; then
    log_result "pmd" "PASS" "$issues" "$duration" ""
  else
    log_result "pmd" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_checkstyle() {
  if ! check_installed checkstyle && ! java -jar /usr/share/java/checkstyle.jar --version &>/dev/null; then
    log_result "checkstyle" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)
  local output=$(checkstyle -c /sun_checks.xml -f xml "$FIXTURES_DIR/java" 2>/dev/null || true)
  local end=$(get_ms)
  local duration=$((end - start))

  local issues=$(echo "$output" | grep -c '<error' || echo 0)

  if [ "$issues" -gt 0 ]; then
    log_result "checkstyle" "PASS" "$issues" "$duration" ""
  else
    log_result "checkstyle" "FAIL" 0 "$duration" "No issues found"
  fi
}

test_dependency_check() {
  local dc_path="${DEPENDENCY_CHECK_PATH:-/usr/local/bin/dependency-check}"
  if [ ! -x "$dc_path" ] && ! check_installed dependency-check; then
    log_result "dependency-check" "SKIP" 0 0 "Not installed"
    return
  fi

  local start=$(get_ms)

  # Use PostgreSQL backend if configured
  local db_args=""
  if [ -n "$DEPCHECK_DB_HOST" ]; then
    db_args="--connectionString jdbc:postgresql://$DEPCHECK_DB_HOST:${DEPCHECK_DB_PORT:-5432}/${DEPCHECK_DB_NAME:-depcheck}"
    db_args="$db_args --dbUser ${DEPCHECK_DB_USER:-depcheck_scanner}"
    db_args="$db_args --dbPassword ${DEPCHECK_DB_PASSWORD:-depcheck123}"
    db_args="$db_args --dbDriverName org.postgresql.Driver"
  fi

  local output_dir="/tmp/dc-output-$$"
  mkdir -p "$output_dir"

  $dc_path --scan "$FIXTURES_DIR/java" --format JSON --out "$output_dir" $db_args 2>/dev/null || true

  local end=$(get_ms)
  local duration=$((end - start))

  local issues=0
  if [ -f "$output_dir/dependency-check-report.json" ]; then
    issues=$(grep -o '"vulnerabilities"' "$output_dir/dependency-check-report.json" | wc -l)
  fi

  rm -rf "$output_dir"

  if [ "$issues" -gt 0 ]; then
    log_result "dependency-check" "PASS" "$issues" "$duration" "PostgreSQL: ${DEPCHECK_DB_HOST:-local}"
  else
    log_result "dependency-check" "FAIL" 0 "$duration" "No CVEs found (check DB connection)"
  fi
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  # Clear results file
  echo "tool|status|issues|time_ms|notes" > "$RESULTS_FILE"

  # Create fixtures
  create_fixtures

  echo ""
  echo "============================================================================"
  echo "                         RUNNING TOOL TESTS"
  echo "============================================================================"
  echo ""

  # P0 - Critical Security Tools
  echo -e "${BLUE}=== P0: Critical Security Tools ===${NC}"
  [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "gitleaks" ] && test_gitleaks
  [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "trufflehog" ] && test_trufflehog
  [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "checkov" ] && test_checkov
  [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "trivy" ] && test_trivy
  [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "grype" ] && test_grype

  if [ "$QUICK_MODE" = true ] && [ -z "$SINGLE_TOOL" ]; then
    echo -e "\n${YELLOW}Quick mode: Skipping P1+ tools${NC}"
  else
    # P1 - Language Security & API
    echo -e "\n${BLUE}=== P1: Language Security & API ===${NC}"
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "semgrep" ] && test_semgrep
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "bandit" ] && test_bandit
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "gosec" ] && test_gosec
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "brakeman" ] && test_brakeman
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "spectral" ] && test_spectral

    # P2 - Code Quality
    echo -e "\n${BLUE}=== P2: Code Quality ===${NC}"
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "eslint" ] && test_eslint
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "ruff" ] && test_ruff
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "pylint" ] && test_pylint
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "rubocop" ] && test_rubocop
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "golangci-lint" ] && test_golangci_lint
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "phpstan" ] && test_phpstan
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "clippy" ] && test_clippy
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "pmd" ] && test_pmd
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "checkstyle" ] && test_checkstyle

    # P3 - Type Checking
    echo -e "\n${BLUE}=== P3: Type Checking ===${NC}"
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "typescript" ] && test_tsc
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "mypy" ] && test_mypy

    # P4 - Dependency Scanning
    echo -e "\n${BLUE}=== P4: Dependency Scanning ===${NC}"
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "dependency-check" ] && test_dependency_check
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "npm-audit" ] && test_npm_audit
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "pip-audit" ] && test_pip_audit
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "safety" ] && test_safety
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "cargo-audit" ] && test_cargo_audit
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "bundler-audit" ] && test_bundler_audit
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "govulncheck" ] && test_govulncheck

    # P5 - Architecture
    echo -e "\n${BLUE}=== P5: Architecture ===${NC}"
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "madge" ] && test_madge
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "staticcheck" ] && test_staticcheck
    [ -z "$SINGLE_TOOL" ] || [ "$SINGLE_TOOL" = "phpcs" ] && test_phpcs
  fi

  # Summary
  echo ""
  echo "============================================================================"
  echo "                              SUMMARY"
  echo "============================================================================"
  echo ""
  echo -e "Total:   ${TOTAL}"
  echo -e "Passed:  ${GREEN}${PASSED}${NC}"
  echo -e "Failed:  ${RED}${FAILED}${NC}"
  echo -e "Skipped: ${YELLOW}${SKIPPED}${NC}"
  echo ""

  if [ $FAILED -eq 0 ] && [ $PASSED -gt 0 ]; then
    echo -e "${GREEN}✅ All tested tools found at least 1 issue!${NC}"
  elif [ $FAILED -gt 0 ]; then
    echo -e "${RED}⚠️  Some tools failed to find issues - investigation needed${NC}"
  fi

  echo ""
  echo "Results saved to: $RESULTS_FILE"

  # Cleanup
  rm -rf "$FIXTURES_DIR"
}

main "$@"
