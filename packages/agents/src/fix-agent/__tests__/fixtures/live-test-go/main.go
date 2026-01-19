/*
Live Test Go File for Tier 2 Native Fixer Validation

This file contains INTENTIONAL issues that should be fixed by various tiers:

Tier 1/2 (gofmt):
- Inconsistent indentation
- Missing/extra whitespace
- Tab vs space issues
- Brace placement

Tier 2 (goimports):
- Unused imports
- Import ordering issues

Tier 2 (golangci-lint --fix):
- misspell: Typos in comments and strings
- whitespace: Extra blank lines

Tier 3 (AI Required - errcheck, staticcheck):
- errcheck: Unchecked error returns
- staticcheck: Ineffective assignments
- gosec: Security issues

DO NOT manually fix these issues - they are test fixtures.
*/
package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Tier 2 (goimports): Unused imports above - ioutil, regexp, sync, time

// Tier 1 (gofmt): Bad formatting - inconsistent spacing
func badlyFormattedFunction(a int,b int,c string)string{
result:=fmt.Sprintf("%d + %d = %s",a,b,c)
return result
}

// Tier 1 (gofmt): Missing spaces around operators
func calculateSum(x int,y int)int{
	return x+y*2-1
}

// Tier 2 (golangci-lint misspell): Typos in comments
// This functon has a typo in the coment that shoud be fixed
// The algoritm calcualtes the aproximate value
func processData(data string) string {
	// Recieve the data and proccess it acordingly
	return strings.ToUpper(data)
}

// Tier 3 (errcheck): Error return value not checked
func readConfigFile(path string) string {
	content, _ := os.ReadFile(path) // errcheck: error ignored
	return string(content)
}

// Tier 3 (errcheck): Multiple unchecked errors
func writeToFile(filename string, data string) {
	file, _ := os.Create(filename) // errcheck: error ignored
	file.WriteString(data)         // errcheck: error ignored
	file.Close()                   // errcheck: error ignored
}

// Tier 1 (gofmt): Inconsistent indentation and spacing
func   badIndentation()    {
    fmt.Println("This line uses spaces")
	fmt.Println("This line uses tabs")
  fmt.Println("Mixed indentation")
}

// Tier 3 (errcheck): HTTP response body not closed properly
func fetchURL(url string) string {
	resp, _ := http.Get(url) // errcheck: error ignored
	body, _ := ioutil.ReadAll(resp.Body) // errcheck: error ignored, deprecated ioutil
	// resp.Body.Close() missing or unchecked
	return string(body)
}

// Tier 3 (staticcheck): Ineffective assignment
func ineffectiveAssign(x int) int {
	result := x * 2
	result = x * 3 // SA4006: ineffective assignment
	result = x * 4
	return result
}

// Tier 1 (gofmt): Bad struct formatting
type BadlyFormattedStruct struct{
name string
value    int
enabled bool
}

// Tier 3 (errcheck): JSON marshal error not checked
func toJSON(data interface{}) string {
	bytes, _ := json.Marshal(data) // errcheck: error ignored
	return string(bytes)
}

// Tier 3 (errcheck): JSON unmarshal error not checked
func fromJSON(jsonStr string) map[string]interface{} {
	var result map[string]interface{}
	json.Unmarshal([]byte(jsonStr), &result) // errcheck: error ignored
	return result
}

// Tier 1 (gofmt): Multiple statements on single line
func multipleStatements() { a := 1; b := 2; fmt.Println(a, b) }

// Tier 2 (golangci-lint whitespace): Extra blank lines in function


func extraBlankLines() {


	fmt.Println("Too many blank lines above and below")


}

// Tier 3 (gosec): Potential command injection (needs AI to fix properly)
func executeCommand(userInput string) {
	// This is a simplified example - real gosec would flag exec.Command with user input
	fmt.Println("Executing: " + userInput)
}

// Tier 1 (gofmt): Bad spacing in if statement
func badIfSpacing(){if true{fmt.Println("Cramped if statement")}}

// Tier 3 (errcheck): Error from fmt.Fprintf not checked
func logMessage(message string) {
	fmt.Fprintf(os.Stderr, "LOG: %s\n", message) // errcheck: return value ignored
}

// Tier 1 (gofmt): Long line that should be wrapped
func veryLongFunctionName(veryLongParameterNameOne string, veryLongParameterNameTwo string, veryLongParameterNameThree string) string { return veryLongParameterNameOne + veryLongParameterNameTwo + veryLongParameterNameThree }

// Tier 2 (golangci-lint misspell): More typos
// Occured is mispelled, seperate shoud be separate, definately wrong
func handleEvent(event string) {
	// Recieved event sucessfully, begining proccess
	fmt.Println("Handeling event: " + event)
}

// Tier 3 (errcheck): Deferred close without error check
func readAndProcess(filename string) {
	file, _ := os.Open(filename) // errcheck: error ignored
	defer file.Close()           // errcheck: error from Close ignored in defer
	// Process file...
}

// Tier 1 (gofmt): Bad map literal formatting
func createMap() map[string]int {
	return map[string]int{"one":1,"two":2,"three":3}
}

// Tier 1 (gofmt): Bad slice literal formatting
func createSlice() []string {
	return []string{"apple","banana","cherry"}
}

// Tier 3 (staticcheck): Unused parameter
func unusedParam(used string, unused int) string {
	return used
}

// Combined issues: formatting + errcheck
func combinedIssues(path string)string{
content,_:=os.ReadFile(path)
result:=string(content)
return result
}

func main() {
	// Basic usage to prevent "declared but not used" errors
	fmt.Println(badlyFormattedFunction(1,2,"test"))
	fmt.Println(calculateSum(5,3))
	fmt.Println(processData("hello"))
	fmt.Println(readConfigFile("config.txt"))
	writeToFile("output.txt","data")
	badIndentation()
	fmt.Println(toJSON(map[string]int{"a":1}))
	fmt.Println(fromJSON(`{"b":2}`))
	multipleStatements()
	extraBlankLines()
	handleEvent("click")
	fmt.Println(createMap())
	fmt.Println(createSlice())
	fmt.Println(combinedIssues("test.txt"))
}
