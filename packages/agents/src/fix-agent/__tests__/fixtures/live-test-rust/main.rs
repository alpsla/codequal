/*
Live Test Rust File for Tier 2 Native Fixer Validation

This file contains INTENTIONAL issues that should be fixed by various tiers:

Tier 1/2 (rustfmt):
- Inconsistent indentation
- Missing/extra whitespace
- Bad brace placement
- Long lines that should be wrapped
- Bad formatting in match arms
- Inconsistent spacing around operators

Tier 2 (clippy --fix):
- needless_return: Explicit return where implicit would work
- redundant_clone: Cloning when not necessary
- let_and_return: Let binding immediately returned
- useless_vec: Vec where array/slice would work
- map_clone: Using .map(|x| x.clone()) instead of .cloned()
- single_match: Single-arm match that could be if-let

Tier 3 (AI Required - complex clippy lints):
- unwrap_used: Using .unwrap() on Option/Result (needs error handling)
- expect_used: Using .expect() that needs proper error handling
- missing_errors_doc: Missing documentation for errors
- cognitive_complexity: Functions that are too complex
- panic: Using panic! that needs proper error handling

DO NOT manually fix these issues - they are test fixtures.
*/

#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use std::collections::HashMap;
use std::fs::File;
use std::io::{self, Read, Write};
use std::path::Path;

// Tier 1 (rustfmt): Bad formatting - inconsistent spacing
fn badly_formatted_function(a:i32,b:i32,c:&str)->String{
let result=format!("{} + {} = {}",a,b,c);
return result;
}

// Tier 1 (rustfmt): Missing spaces around operators
fn calculate_sum(x:i32,y:i32)->i32{
    return x+y*2-1;
}

// Tier 2 (clippy needless_return): Explicit return not needed
fn needless_return_example(x: i32) -> i32 {
    if x > 0 {
        return x * 2;
    } else {
        return x * -1;
    }
}

// Tier 2 (clippy needless_return): Simple case
fn simple_needless_return(value: String) -> String {
    return value.to_uppercase();
}

// Tier 2 (clippy let_and_return): Let binding immediately returned
fn let_and_return_example(x: i32, y: i32) -> i32 {
    let result = x + y;
    return result;
}

// Tier 2 (clippy redundant_clone): Cloning when not necessary
fn redundant_clone_example(s: &String) -> String {
    let owned = s.clone();
    let cloned_again = owned.clone(); // redundant_clone
    cloned_again
}

// Tier 2 (clippy redundant_clone): Another example
fn process_string_redundant(input: String) -> String {
    let s = input.clone(); // redundant - input is already owned
    s.to_uppercase()
}

// Tier 1 (rustfmt): Bad struct formatting
struct BadlyFormattedStruct{
name:String,
value:    i32,
enabled: bool,
}

// Tier 1 (rustfmt): Bad impl formatting
impl BadlyFormattedStruct{
fn new(name:String,value:i32)->Self{
Self{name:name,value:value,enabled:true}
}
fn get_name(&self)->   &str{
&self.name
}
}

// Tier 2 (clippy useless_vec): Vec where slice would work
fn useless_vec_example() {
    let _numbers = vec![1, 2, 3, 4, 5];
    for n in vec![1, 2, 3].iter() { // useless_vec: could be [1, 2, 3].iter()
        println!("{}", n);
    }
}

// Tier 2 (clippy map_clone): Using map with clone instead of cloned
fn map_clone_example(strings: &[String]) -> Vec<String> {
    strings.iter().map(|s| s.clone()).collect() // clippy: map_clone
}

// Tier 2 (clippy single_match): Single match arm that could be if-let
fn single_match_example(option: Option<i32>) {
    match option {
        Some(value) => println!("Got value: {}", value),
        None => {},
    }
}

// Tier 1 (rustfmt): Bad match formatting
fn bad_match_formatting(x: i32) -> &'static str {
match x{
0=>"zero",
1=>"one",
2=>"two",
_=>"other",
}
}

// Tier 3 (clippy unwrap_used): Using unwrap on Result - needs proper error handling
fn unwrap_example(path: &str) -> String {
    let mut file = File::open(path).unwrap(); // Tier 3: unwrap_used
    let mut contents = String::new();
    file.read_to_string(&mut contents).unwrap(); // Tier 3: unwrap_used
    contents
}

// Tier 3 (clippy expect_used): Using expect - needs proper error handling
fn expect_example(data: &str) -> i32 {
    data.parse::<i32>().expect("Failed to parse integer") // Tier 3: expect_used
}

// Tier 3 (AI required): Complex function with multiple unwraps and panics
fn complex_error_handling(path: &str, key: &str) -> String {
    let file = File::open(path).unwrap(); // Tier 3: unwrap
    let mut contents = String::new();
    let mut reader = io::BufReader::new(file);

    // This is intentionally complex to require AI understanding
    let map: HashMap<String, String> = HashMap::new();
    let value = map.get(key).unwrap(); // Tier 3: unwrap on Option

    if value.is_empty() {
        panic!("Value cannot be empty!"); // Tier 3: panic
    }

    value.clone()
}

// Tier 1 (rustfmt): Long line that should be wrapped
fn very_long_function_name(very_long_parameter_name_one: String, very_long_parameter_name_two: String, very_long_parameter_name_three: String) -> String { return very_long_parameter_name_one + &very_long_parameter_name_two + &very_long_parameter_name_three; }

// Tier 2 (clippy needless_return): In closure
fn needless_return_in_closure() -> Vec<i32> {
    let numbers = vec![1, 2, 3, 4, 5];
    numbers.iter().map(|x| {
        return x * 2;
    }).collect()
}

// Tier 1 (rustfmt): Bad if formatting
fn bad_if_formatting(x:i32){if x>0{println!("Positive")}else{println!("Non-positive")}}

// Tier 2 (clippy redundant_clone): With methods
fn redundant_method_clone() {
    let s = String::from("hello");
    let s2 = s.clone();
    let s3 = s2.clone(); // redundant_clone - s2 not used after this
    println!("{}", s3);
}

// Tier 1 (rustfmt): Bad array/vec formatting
fn create_vector() -> Vec<i32> {
    vec![1,2,3,4,5,6,7,8,9,10]
}

fn create_hashmap() -> HashMap<String, i32> {
    let mut map=HashMap::new();
    map.insert("one".to_string(),1);
    map.insert("two".to_string(),2);
    map.insert("three".to_string(),3);
    return map;
}

// Tier 3 (AI required): Function with potential panic that needs Result return
fn divide_numbers(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Division by zero!"); // Tier 3: should return Result<i32, Error>
    }
    a / b
}

// Tier 3 (AI required): Index access without bounds check
fn get_element_unsafe(vec: &Vec<i32>, index: usize) -> i32 {
    vec[index] // Tier 3: could panic, should use .get() and handle None
}

// Tier 2 (clippy let_and_return): Multiple instances
fn multiple_let_and_return(a: i32, b: i32) -> i32 {
    let sum = a + b;
    let doubled = sum * 2;
    let result = doubled + 1;
    return result;
}

// Tier 1 (rustfmt): Bad tuple formatting
fn create_tuple() -> (i32,i32,String) {
    (1,2,"three".to_string())
}

// Combined issues: formatting + clippy
fn combined_issues(s:&String)->String{
let cloned=s.clone();
let result=cloned.to_uppercase();
return result;
}

// Tier 2 (clippy single_match): Another example
fn another_single_match(result: Result<i32, &str>) {
    match result {
        Ok(v) => println!("Success: {}", v),
        Err(_) => {},
    }
}

// Tier 3 (AI required): Complex logic with multiple potential failure points
fn process_config_file(path: &str) -> HashMap<String, String> {
    let content = std::fs::read_to_string(path).unwrap(); // Tier 3: unwrap
    let mut config = HashMap::new();

    for line in content.lines() {
        if line.trim().is_empty() || line.starts_with('#') {
            continue;
        }
        let parts: Vec<&str> = line.splitn(2, '=').collect();
        if parts.len() != 2 {
            panic!("Invalid config line: {}", line); // Tier 3: panic
        }
        config.insert(parts[0].trim().to_string(), parts[1].trim().to_string());
    }

    config
}

fn main() {
    // Basic usage to prevent "declared but not used" warnings
    println!("{}",badly_formatted_function(1,2,"test"));
    println!("{}",calculate_sum(5,3));
    println!("{}",needless_return_example(10));
    println!("{}",simple_needless_return("hello".to_string()));
    println!("{}",let_and_return_example(3,4));

    let s = String::from("test");
    println!("{}",redundant_clone_example(&s));
    println!("{}",process_string_redundant("input".to_string()));

    useless_vec_example();
    let strings = vec!["a".to_string(),"b".to_string()];
    println!("{:?}",map_clone_example(&strings));
    single_match_example(Some(42));
    println!("{}",bad_match_formatting(1));

    println!("{:?}",needless_return_in_closure());
    bad_if_formatting(5);
    redundant_method_clone();
    println!("{:?}",create_vector());
    println!("{:?}",create_hashmap());
    println!("{}",multiple_let_and_return(1,2));
    println!("{:?}",create_tuple());
    println!("{}",combined_issues(&s));
    another_single_match(Ok(10));
}
