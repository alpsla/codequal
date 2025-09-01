#!/bin/bash

# Create Test Repositories with Vulnerable Code
# For testing real security tools on the DigitalOcean droplet

set -e

echo "🔨 Creating test repositories with vulnerable code samples"
echo "=========================================================="

BASE_DIR="/opt/test-repos"

# Create base directory
mkdir -p "$BASE_DIR"

# ==========================================
# JAVA TEST REPOSITORY
# ==========================================
echo "Creating Java test repository..."
JAVA_DIR="$BASE_DIR/java-sample"
mkdir -p "$JAVA_DIR/src/main/java/com/example"

# Vulnerable Java code with multiple security issues
cat << 'EOF' > "$JAVA_DIR/src/main/java/com/example/VulnerableApp.java"
package com.example;

import java.sql.*;
import java.io.*;
import java.util.Random;
import javax.servlet.http.*;

public class VulnerableApp {
    private static final String PASSWORD = "admin123"; // Hardcoded password
    
    // SQL Injection vulnerability
    public User getUser(String userId) throws SQLException {
        String query = "SELECT * FROM users WHERE id = " + userId; // SQL Injection
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db");
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery(query);
        
        // Resource leak - connection not closed
        if (rs.next()) {
            return new User(rs.getString("name"), rs.getString("email"));
        }
        return null;
    }
    
    // Path Traversal vulnerability
    public void readFile(String filename) throws IOException {
        File file = new File("/uploads/" + filename); // Path traversal
        BufferedReader reader = new BufferedReader(new FileReader(file));
        // Reader not closed - resource leak
    }
    
    // Weak random number generation
    public String generateToken() {
        Random rand = new Random(); // Predictable random
        return String.valueOf(rand.nextInt(10000));
    }
    
    // XSS vulnerability
    public void displayMessage(HttpServletResponse response, String message) throws IOException {
        response.getWriter().write("<div>" + message + "</div>"); // XSS
    }
    
    // Command injection
    public void executeCommand(String userInput) throws IOException {
        Runtime.getRuntime().exec("ping " + userInput); // Command injection
    }
    
    // Null pointer dereference
    public void processData(String data) {
        if (data.length() > 0) { // NPE if data is null
            System.out.println(data.toUpperCase());
        }
    }
    
    class User {
        String name;
        String email;
        
        User(String n, String e) {
            this.name = n;
            this.email = e;
        }
    }
}
EOF

# Create pom.xml for Maven
cat << 'EOF' > "$JAVA_DIR/pom.xml"
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>vulnerable-app</artifactId>
    <version>1.0.0</version>
    <dependencies>
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <version>5.1.6</version>
        </dependency>
        <dependency>
            <groupId>javax.servlet</groupId>
            <artifactId>servlet-api</artifactId>
            <version>2.5</version>
        </dependency>
    </dependencies>
</project>
EOF

echo "✅ Java test repository created"

# ==========================================
# PHP TEST REPOSITORY
# ==========================================
echo "Creating PHP test repository..."
PHP_DIR="$BASE_DIR/php-sample"
mkdir -p "$PHP_DIR"

# Vulnerable PHP code
cat << 'EOF' > "$PHP_DIR/vulnerable.php"
<?php
// SQL Injection vulnerability
function getUser($id) {
    $conn = mysqli_connect("localhost", "root", "password", "database");
    $query = "SELECT * FROM users WHERE id = " . $id; // SQL Injection
    $result = mysqli_query($conn, $query);
    return mysqli_fetch_assoc($result);
}

// XSS vulnerability
function displayName($name) {
    echo "<h1>Welcome " . $name . "</h1>"; // XSS
}

// Command injection
function pingHost($host) {
    system("ping -c 4 " . $host); // Command injection
}

// File inclusion vulnerability
function includeTemplate($template) {
    include("/templates/" . $template); // LFI/RFI
}

// Weak password hashing
function hashPassword($password) {
    return md5($password); // Weak hashing
}

// Insecure deserialization
function loadUserData($data) {
    return unserialize($data); // Insecure deserialization
}

// Directory traversal
function downloadFile($filename) {
    $file = "/uploads/" . $filename; // Path traversal
    readfile($file);
}

// Hardcoded credentials
$admin_password = "admin123";
$api_key = "sk-1234567890abcdef";

// Session fixation
session_id($_GET['sid']);
session_start();

// Weak random token
function generateToken() {
    return rand(1000, 9999); // Predictable random
}

// Open redirect
function redirect($url) {
    header("Location: " . $url); // Open redirect
    exit();
}

// LDAP injection
function authenticateLDAP($username, $password) {
    $ldap = ldap_connect("ldap://localhost");
    $dn = "uid=" . $username . ",ou=users,dc=example,dc=com"; // LDAP injection
    return ldap_bind($ldap, $dn, $password);
}
?>
EOF

echo "✅ PHP test repository created"

# ==========================================
# C++ TEST REPOSITORY
# ==========================================
echo "Creating C++ test repository..."
CPP_DIR="$BASE_DIR/cpp-sample"
mkdir -p "$CPP_DIR"

# Vulnerable C++ code
cat << 'EOF' > "$CPP_DIR/vulnerable.cpp"
#include <iostream>
#include <cstring>
#include <cstdlib>
#include <fstream>

using namespace std;

class VulnerableApp {
public:
    // Buffer overflow vulnerability
    void copyInput(char* input) {
        char buffer[10];
        strcpy(buffer, input); // Buffer overflow
        cout << "Buffer: " << buffer << endl;
    }
    
    // Format string vulnerability
    void logMessage(char* message) {
        printf(message); // Format string vulnerability
    }
    
    // Integer overflow
    int calculateSize(int width, int height) {
        return width * height; // Integer overflow possible
    }
    
    // Use after free
    void processData() {
        int* data = new int[10];
        delete[] data;
        data[0] = 100; // Use after free
    }
    
    // Memory leak
    void allocateMemory() {
        int* leak = new int[1000]; // Memory leak
        // Memory never freed
    }
    
    // Race condition
    int counter = 0;
    void incrementCounter() {
        counter++; // Race condition in multithreaded context
    }
    
    // Command injection
    void executeCommand(string userInput) {
        string cmd = "ls " + userInput;
        system(cmd.c_str()); // Command injection
    }
    
    // Path traversal
    void readFile(string filename) {
        string path = "/data/" + filename; // Path traversal
        ifstream file(path);
        // File operations
    }
    
    // Null pointer dereference
    void processPointer(int* ptr) {
        cout << *ptr << endl; // Potential null dereference
    }
    
    // Divide by zero
    int divide(int a, int b) {
        return a / b; // Divide by zero if b is 0
    }
};

int main(int argc, char* argv[]) {
    VulnerableApp app;
    
    if (argc > 1) {
        app.copyInput(argv[1]);
        app.logMessage(argv[1]);
    }
    
    return 0;
}
EOF

# Create Makefile
cat << 'EOF' > "$CPP_DIR/Makefile"
CXX = g++
CXXFLAGS = -Wall -g

all: vulnerable

vulnerable: vulnerable.cpp
	$(CXX) $(CXXFLAGS) -o vulnerable vulnerable.cpp

clean:
	rm -f vulnerable
EOF

echo "✅ C++ test repository created"

# ==========================================
# RUST TEST REPOSITORY
# ==========================================
echo "Creating Rust test repository..."
RUST_DIR="$BASE_DIR/rust-sample"
mkdir -p "$RUST_DIR/src"

# Vulnerable Rust code (intentionally using unsafe)
cat << 'EOF' > "$RUST_DIR/src/main.rs"
use std::fs::File;
use std::io::Read;
use std::process::Command;

fn main() {
    // Unwrap without proper error handling
    let file = File::open("config.txt").unwrap(); // Can panic
    
    unsafe_operations();
    command_injection("user_input");
    path_traversal("../../etc/passwd");
}

// Unsafe code block
fn unsafe_operations() {
    unsafe {
        let ptr = 0x12345678 as *mut i32;
        *ptr = 42; // Dereferencing arbitrary pointer
    }
    
    let data = vec![1, 2, 3];
    unsafe {
        let ptr = data.as_ptr();
        let val = *ptr.offset(10); // Out of bounds access
        println!("Value: {}", val);
    }
}

// Command injection vulnerability
fn command_injection(user_input: &str) {
    let output = Command::new("sh")
        .arg("-c")
        .arg(format!("echo {}", user_input)) // Command injection
        .output()
        .expect("Failed to execute command");
    
    println!("Output: {:?}", output);
}

// Path traversal
fn path_traversal(filename: &str) {
    let path = format!("/uploads/{}", filename); // Path traversal
    let mut file = File::open(path).expect("File not found");
    let mut contents = String::new();
    file.read_to_string(&mut contents).expect("Failed to read");
}

// Panic in production code
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Division by zero!"); // Should return Result instead
    }
    a / b
}

// Using unwrap excessively
fn parse_number(s: &str) -> i32 {
    s.parse().unwrap() // Can panic on invalid input
}

// Memory leak through Rc cycles
use std::rc::Rc;
use std::cell::RefCell;

struct Node {
    value: i32,
    next: Option<Rc<RefCell<Node>>>,
}

fn create_cycle() {
    let node1 = Rc::new(RefCell::new(Node { value: 1, next: None }));
    let node2 = Rc::new(RefCell::new(Node { value: 2, next: None }));
    
    node1.borrow_mut().next = Some(node2.clone());
    node2.borrow_mut().next = Some(node1.clone()); // Creates cycle
}
EOF

# Create Cargo.toml
cat << 'EOF' > "$RUST_DIR/Cargo.toml"
[package]
name = "vulnerable-rust"
version = "0.1.0"
edition = "2021"

[dependencies]
EOF

echo "✅ Rust test repository created"

# ==========================================
# PYTHON TEST REPOSITORY
# ==========================================
echo "Creating Python test repository..."
PYTHON_DIR="$BASE_DIR/python-sample"
mkdir -p "$PYTHON_DIR"

# Vulnerable Python code
cat << 'EOF' > "$PYTHON_DIR/vulnerable.py"
import os
import pickle
import subprocess
import hashlib
import random
import sqlite3
from flask import Flask, request, render_template_string

app = Flask(__name__)

# SQL Injection
def get_user(user_id):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE id = {user_id}"  # SQL Injection
    cursor.execute(query)
    return cursor.fetchone()

# Command injection
def ping_host(hostname):
    cmd = f"ping -c 4 {hostname}"  # Command injection
    return subprocess.call(cmd, shell=True)

# Path traversal
def read_file(filename):
    path = f"/uploads/{filename}"  # Path traversal
    with open(path, 'r') as f:
        return f.read()

# Insecure deserialization
def load_data(data):
    return pickle.loads(data)  # Insecure deserialization

# Weak cryptography
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()  # Weak hash

# Hardcoded secrets
API_KEY = "sk-1234567890abcdef"
DATABASE_PASSWORD = "admin123"

# Weak random
def generate_token():
    return random.randint(1000, 9999)  # Predictable random

# XSS in Flask
@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    template = f"<h1>Hello {name}</h1>"  # XSS vulnerability
    return render_template_string(template)

# XXE vulnerability
import xml.etree.ElementTree as ET

def parse_xml(xml_string):
    root = ET.fromstring(xml_string)  # XXE vulnerability
    return root

# SSRF vulnerability
import urllib.request

def fetch_url(url):
    return urllib.request.urlopen(url).read()  # SSRF

# Eval injection
def calculate(expression):
    return eval(expression)  # Code injection

# Assert in production
def validate_input(value):
    assert value > 0, "Value must be positive"  # Assert in production
    return value

# Timing attack vulnerability
def check_password(input_password, correct_password):
    if len(input_password) != len(correct_password):
        return False
    for i in range(len(input_password)):
        if input_password[i] != correct_password[i]:
            return False  # Timing attack
    return True

if __name__ == "__main__":
    app.run(debug=True)  # Debug mode in production
EOF

echo "✅ Python test repository created"

# ==========================================
# GO TEST REPOSITORY
# ==========================================
echo "Creating Go test repository..."
GO_DIR="$BASE_DIR/go-sample"
mkdir -p "$GO_DIR"

# Vulnerable Go code
cat << 'EOF' > "$GO_DIR/vulnerable.go"
package main

import (
    "database/sql"
    "fmt"
    "io/ioutil"
    "log"
    "math/rand"
    "net/http"
    "os/exec"
    "crypto/md5"
    _ "github.com/go-sql-driver/mysql"
)

// SQL Injection
func getUser(db *sql.DB, userID string) {
    query := fmt.Sprintf("SELECT * FROM users WHERE id = %s", userID) // SQL Injection
    rows, err := db.Query(query)
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()
}

// Command injection
func runCommand(userInput string) {
    cmd := exec.Command("sh", "-c", "echo "+userInput) // Command injection
    output, _ := cmd.Output()
    fmt.Println(string(output))
}

// Path traversal
func readFile(w http.ResponseWriter, r *http.Request) {
    filename := r.URL.Query().Get("file")
    data, _ := ioutil.ReadFile("/uploads/" + filename) // Path traversal
    w.Write(data)
}

// Weak random number
func generateToken() int {
    return rand.Intn(10000) // Weak random
}

// Weak hashing
func hashPassword(password string) string {
    return fmt.Sprintf("%x", md5.Sum([]byte(password))) // Weak hash
}

// Hardcoded credentials
const (
    APIKey = "sk-1234567890abcdef"
    DBPassword = "admin123"
)

// XSS vulnerability
func greetUser(w http.ResponseWriter, r *http.Request) {
    name := r.URL.Query().Get("name")
    fmt.Fprintf(w, "<h1>Hello %s</h1>", name) // XSS
}

// Integer overflow
func multiply(a, b int32) int32 {
    return a * b // Integer overflow possible
}

// Race condition
var counter int

func incrementCounter() {
    counter++ // Race condition
}

// Unvalidated redirect
func redirect(w http.ResponseWriter, r *http.Request) {
    url := r.URL.Query().Get("url")
    http.Redirect(w, r, url, http.StatusFound) // Open redirect
}

// Error info leakage
func handleError(w http.ResponseWriter, err error) {
    http.Error(w, err.Error(), http.StatusInternalServerError) // Info leakage
}

func main() {
    http.HandleFunc("/file", readFile)
    http.HandleFunc("/greet", greetUser)
    http.HandleFunc("/redirect", redirect)
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
EOF

# Create go.mod
cat << 'EOF' > "$GO_DIR/go.mod"
module vulnerable-app

go 1.19

require github.com/go-sql-driver/mysql v1.6.0
EOF

echo "✅ Go test repository created"

# ==========================================
# RUBY TEST REPOSITORY
# ==========================================
echo "Creating Ruby test repository..."
RUBY_DIR="$BASE_DIR/ruby-sample"
mkdir -p "$RUBY_DIR"

# Vulnerable Ruby code
cat << 'EOF' > "$RUBY_DIR/vulnerable.rb"
require 'sinatra'
require 'mysql2'
require 'yaml'
require 'digest'

class VulnerableApp < Sinatra::Base
  # SQL Injection
  get '/user/:id' do
    client = Mysql2::Client.new(host: "localhost", username: "root")
    query = "SELECT * FROM users WHERE id = #{params[:id]}" # SQL Injection
    results = client.query(query)
    results.to_json
  end
  
  # Command injection
  get '/ping' do
    host = params[:host]
    `ping -c 4 #{host}` # Command injection
  end
  
  # Path traversal
  get '/download' do
    filename = params[:file]
    send_file "/uploads/#{filename}" # Path traversal
  end
  
  # Mass assignment vulnerability
  post '/user/update' do
    user = User.find(params[:id])
    user.update_attributes(params[:user]) # Mass assignment
    user.to_json
  end
  
  # XSS vulnerability
  get '/greet' do
    name = params[:name]
    "<h1>Hello #{name}</h1>" # XSS
  end
  
  # Insecure deserialization
  post '/load' do
    data = params[:data]
    YAML.load(data) # Insecure deserialization
  end
  
  # Weak hashing
  def hash_password(password)
    Digest::MD5.hexdigest(password) # Weak hash
  end
  
  # Hardcoded secrets
  API_KEY = "sk-1234567890abcdef"
  SECRET_TOKEN = "secret123"
  
  # Open redirect
  get '/redirect' do
    redirect params[:url] # Open redirect
  end
  
  # File upload without validation
  post '/upload' do
    file = params[:file][:tempfile]
    filename = params[:file][:filename]
    File.open("/uploads/#{filename}", 'wb') do |f| # No validation
      f.write(file.read)
    end
  end
  
  # Regex DoS
  def validate_email(email)
    email =~ /^([a-zA-Z0-9])+([a-zA-Z0-9\._-])*@([a-zA-Z0-9_-])+([a-zA-Z0-9\._-]+)+$/ # ReDoS
  end
  
  # Session fixation
  get '/login' do
    session[:user_id] = params[:user_id] # Session fixation
  end
end
EOF

# Create Gemfile
cat << 'EOF' > "$RUBY_DIR/Gemfile"
source 'https://rubygems.org'

gem 'sinatra'
gem 'mysql2'
EOF

echo "✅ Ruby test repository created"

# ==========================================
# JAVASCRIPT TEST REPOSITORY  
# ==========================================
echo "Creating JavaScript test repository..."
JS_DIR="$BASE_DIR/javascript-sample"
mkdir -p "$JS_DIR"

# Vulnerable JavaScript code
cat << 'EOF' > "$JS_DIR/vulnerable.js"
const express = require('express');
const mysql = require('mysql');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();

// Hardcoded secrets
const API_KEY = 'sk-1234567890abcdef';
const DB_PASSWORD = 'admin123';

// SQL Injection
app.get('/user/:id', (req, res) => {
    const query = `SELECT * FROM users WHERE id = ${req.params.id}`; // SQL Injection
    connection.query(query, (err, results) => {
        res.json(results);
    });
});

// XSS vulnerability
app.get('/greet', (req, res) => {
    const name = req.query.name;
    res.send(`<h1>Hello ${name}</h1>`); // XSS
});

// Command injection
app.get('/ping', (req, res) => {
    const host = req.query.host;
    exec(`ping -c 4 ${host}`, (err, stdout) => { // Command injection
        res.send(stdout);
    });
});

// Path traversal
app.get('/file', (req, res) => {
    const filename = req.query.file;
    const path = `/uploads/${filename}`; // Path traversal
    res.sendFile(path);
});

// Insecure randomness
function generateToken() {
    return Math.random().toString(36).substring(7); // Weak random
}

// Weak hashing
function hashPassword(password) {
    return crypto.createHash('md5').update(password).digest('hex'); // Weak hash
}

// eval() usage
app.post('/calculate', (req, res) => {
    const expression = req.body.expression;
    const result = eval(expression); // Code injection
    res.json({ result });
});

// NoSQL injection
app.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    db.collection('items').find({ $where: `this.name == '${searchTerm}'` }); // NoSQL injection
});

// XXE vulnerability
const xml2js = require('xml2js');
app.post('/xml', (req, res) => {
    const parser = new xml2js.Parser(); // XXE if not configured properly
    parser.parseString(req.body, (err, result) => {
        res.json(result);
    });
});

// Prototype pollution
function merge(target, source) {
    for (let key in source) {
        if (typeof source[key] === 'object') {
            target[key] = merge(target[key] || {}, source[key]);
        } else {
            target[key] = source[key]; // Prototype pollution
        }
    }
    return target;
}

// RegEx DoS
function validateInput(input) {
    const regex = /^(a+)+$/; // ReDoS vulnerability
    return regex.test(input);
}

// Timing attack
function checkApiKey(providedKey) {
    if (providedKey.length !== API_KEY.length) return false;
    for (let i = 0; i < providedKey.length; i++) {
        if (providedKey[i] !== API_KEY[i]) return false; // Timing attack
    }
    return true;
}

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
EOF

# Create package.json
cat << 'EOF' > "$JS_DIR/package.json"
{
  "name": "vulnerable-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.17.1",
    "mysql": "^2.18.1",
    "xml2js": "^0.4.23"
  }
}
EOF

echo "✅ JavaScript test repository created"

echo ""
echo "=========================================================="
echo "✅ All test repositories created successfully!"
echo "Location: $BASE_DIR"
echo ""
echo "Repository Summary:"
echo "  • Java:       $JAVA_DIR"
echo "  • PHP:        $PHP_DIR"
echo "  • C++:        $CPP_DIR"
echo "  • Rust:       $RUST_DIR"
echo "  • Python:     $PYTHON_DIR"
echo "  • Go:         $GO_DIR"
echo "  • Ruby:       $RUBY_DIR"
echo "  • JavaScript: $JS_DIR"
echo ""
echo "Each repository contains intentionally vulnerable code"
echo "for testing security analysis tools."
echo "=========================================================="