/**
 * Live Test C++ File for Tier 2 Native Fixer Validation
 *
 * This file contains INTENTIONAL issues that should be fixed by various tiers:
 *
 * Tier 1 (clang-format):
 * - Inconsistent indentation
 * - Missing/extra whitespace
 * - Brace placement issues
 * - Operator spacing
 * - Line length issues
 *
 * Tier 2 (clang-tidy modernize-*):
 * - modernize-use-nullptr: Use nullptr instead of NULL/0
 * - modernize-use-override: Add override specifier to virtual functions
 * - modernize-use-auto: Use auto for iterator declarations
 * - modernize-loop-convert: Convert C-style loops to range-based
 * - modernize-use-default-member-init: Use default member initialization
 *
 * Tier 3 (AI Required - cppcheck):
 * - memleak: Memory leak detection
 * - nullPointer: Null pointer dereference
 * - uninitvar: Uninitialized variable use
 * - resourceLeak: File handles not closed
 *
 * DO NOT manually fix these issues - they are test fixtures.
 */

#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <fstream>
#include <cstring>
#include <cstdlib>

// Tier 2 (modernize-use-override): Base class for testing override
class BaseClass {
public:
    virtual void process() { std::cout << "Base process" << std::endl; }
    virtual int calculate(int x) { return x; }
    virtual ~BaseClass() {}
};

// Tier 2 (modernize-use-override): Missing override specifier
class DerivedClass : public BaseClass {
public:
    // modernize-use-override: should have override specifier
    virtual void process() { std::cout << "Derived process" << std::endl; }
    // modernize-use-override: should have override specifier
    virtual int calculate(int x) { return x * 2; }
    // modernize-use-override: destructor should have override
    virtual ~DerivedClass() {}
};

// Another derived class with override issues
class AnotherDerived : public BaseClass {
public:
    // modernize-use-override: missing override
    virtual void process() { std::cout << "Another process" << std::endl; }
    // modernize-use-override: missing override
    virtual int calculate(int x) { return x + 10; }
};

// Tier 1 (clang-format): Bad formatting - inconsistent spacing
int badlyFormattedFunction(int a,int b,int c){
int result=a+b*c;
return result;
}

// Tier 1 (clang-format): Missing spaces around operators
int calculateSum(int x,int y){
    return x+y*2-1;
}

// Tier 2 (modernize-use-nullptr): Use NULL instead of nullptr
void nullPointerExamples() {
    // modernize-use-nullptr: should use nullptr
    int* ptr1 = NULL;
    char* ptr2 = NULL;
    void* ptr3 = 0;

    // modernize-use-nullptr: NULL in comparison
    if (ptr1 == NULL) {
        std::cout << "ptr1 is null" << std::endl;
    }

    // modernize-use-nullptr: 0 in comparison
    if (ptr2 != 0) {
        std::cout << "ptr2 is not null" << std::endl;
    }
}

// Tier 2 (modernize-use-nullptr): NULL in function arguments
void processPointer(int* ptr) {
    if (ptr != NULL) {
        std::cout << *ptr << std::endl;
    }
}

void callWithNull() {
    // modernize-use-nullptr: passing NULL as argument
    processPointer(NULL);
}

// Tier 1 (clang-format): Poor brace placement and spacing
void badBracePlacement(){
if(true){
std::cout<<"Cramped braces"<<std::endl;
}else{
std::cout<<"No spaces"<<std::endl;
}
}

// Tier 2 (modernize-use-auto): Iterator declarations
void iteratorExamples() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    std::map<std::string, int> scores;
    scores["alice"] = 100;
    scores["bob"] = 95;

    // modernize-use-auto: verbose iterator declarations
    for (std::vector<int>::iterator it = numbers.begin(); it != numbers.end(); ++it) {
        std::cout << *it << std::endl;
    }

    // modernize-use-auto: verbose const_iterator
    for (std::vector<int>::const_iterator it = numbers.cbegin(); it != numbers.cend(); ++it) {
        std::cout << *it << std::endl;
    }

    // modernize-use-auto: map iterator
    for (std::map<std::string, int>::iterator it = scores.begin(); it != scores.end(); ++it) {
        std::cout << it->first << ": " << it->second << std::endl;
    }
}

// Tier 1 (clang-format): Inconsistent indentation
void mixedIndentation() {
    int a = 1;
  int b = 2;
        int c = 3;
	int d = 4;
    std::cout << a << b << c << d << std::endl;
}

// Tier 3 (cppcheck memleak): Memory allocated but not freed
void memoryLeakExample(int size) {
    // cppcheck: Memory leak - allocated memory never freed
    int* array = new int[size];
    for (int i = 0; i < size; i++) {
        array[i] = i * 2;
    }
    std::cout << "Array processed" << std::endl;
    // Missing: delete[] array;
}

// Tier 3 (cppcheck memleak): Multiple memory leaks
void multipleMemoryLeaks() {
    // cppcheck: Memory leak
    char* buffer1 = new char[100];
    std::strcpy(buffer1, "Hello");

    // cppcheck: Memory leak
    int* buffer2 = (int*)malloc(sizeof(int) * 50);
    buffer2[0] = 42;

    // cppcheck: Memory leak - conditional return without cleanup
    if (buffer2[0] > 40) {
        std::cout << "Returning early without freeing" << std::endl;
        return;  // Memory leaks for buffer1 and buffer2
    }

    // This code is unreachable if condition is true
    delete[] buffer1;
    free(buffer2);
}

// Tier 3 (cppcheck nullPointer): Potential null pointer dereference
void nullPointerDereference(int* ptr) {
    // cppcheck: nullPointer - dereferencing before null check
    int value = *ptr;  // Dereference before check

    if (ptr == NULL) {
        std::cout << "ptr is null" << std::endl;
        return;
    }

    std::cout << "Value: " << value << std::endl;
}

// Tier 3 (cppcheck uninitvar): Uninitialized variable
int uninitializedVariable(bool flag) {
    int result;  // cppcheck: uninitvar - may be used uninitialized

    if (flag) {
        result = 42;
    }
    // No else clause - result uninitialized if flag is false

    return result;
}

// Tier 1 (clang-format): Long line that should be wrapped
void veryLongFunctionWithManyParameters(std::string parameterOne, std::string parameterTwo, std::string parameterThree, int parameterFour, int parameterFive, bool parameterSix) { std::cout << parameterOne << parameterTwo << parameterThree << parameterFour << parameterFive << parameterSix << std::endl; }

// Tier 3 (cppcheck resourceLeak): File handle not closed
void fileResourceLeak(const std::string& filename) {
    // cppcheck: resourceLeak - FILE* not closed
    FILE* file = fopen(filename.c_str(), "r");
    if (file != NULL) {
        char buffer[256];
        while (fgets(buffer, sizeof(buffer), file) != NULL) {
            std::cout << buffer;
        }
        // Missing: fclose(file);
    }
}

// Tier 3 (cppcheck resourceLeak): ifstream not closed
void streamResourceLeak(const std::string& filename) {
    // cppcheck: resourceLeak - ifstream opened but never closed
    std::ifstream* file = new std::ifstream(filename);
    if (file->is_open()) {
        std::string line;
        while (std::getline(*file, line)) {
            std::cout << line << std::endl;
        }
    }
    // Missing: file->close() and delete file;
}

// Tier 1 (clang-format): Bad struct formatting
struct BadlyFormattedStruct{
int x;int y;
std::string name;bool enabled;
};

// Tier 2 (modernize-use-nullptr): Class with NULL member init
class ClassWithNullInit {
public:
    // modernize-use-nullptr: NULL in member initialization
    ClassWithNullInit() : ptr(NULL), data(0) {}

    void setPtr(int* p) {
        // modernize-use-nullptr: NULL comparison
        if (p != NULL) {
            ptr = p;
        }
    }

private:
    int* ptr;
    int* data;
};

// Tier 3 (cppcheck): Use after free
void useAfterFree() {
    int* ptr = new int(42);
    std::cout << "Value: " << *ptr << std::endl;
    delete ptr;
    // cppcheck: Using pointer after it was freed
    std::cout << "After delete: " << *ptr << std::endl;  // Use after free!
}

// Tier 1 (clang-format): Multiple statements on one line
void multipleStatements() { int a = 1; int b = 2; int c = 3; std::cout << a << b << c << std::endl; }

// Tier 3 (cppcheck): Double free
void doubleFree(bool condition) {
    int* ptr = new int(100);

    if (condition) {
        delete ptr;
    }

    // cppcheck: Double free if condition was true
    delete ptr;
}

// Tier 2 (modernize-loop-convert): C-style for loop that could be range-based
void cStyleLoops() {
    std::vector<int> numbers = {10, 20, 30, 40, 50};

    // modernize-loop-convert: should be range-based for loop
    for (size_t i = 0; i < numbers.size(); i++) {
        std::cout << numbers[i] << std::endl;
    }

    int array[] = {1, 2, 3, 4, 5};
    // modernize-loop-convert: should be range-based for loop
    for (int i = 0; i < 5; i++) {
        std::cout << array[i] << std::endl;
    }
}

// Tier 1 (clang-format): Bad array initialization
int badArrayInit[] = {1,2,3,4,5,6,7,8,9,10};

// Combined issues: formatting + modernize + potential cppcheck
class CombinedIssues{
public:
CombinedIssues():value(NULL),count(0){}
void setValue(int*v){if(v!=NULL){value=v;}}
int*getValue(){return value;}
private:
int*value;int count;
};

int main() {
    // Basic usage to prevent "unused" warnings
    DerivedClass derived;
    derived.process();
    std::cout << derived.calculate(5) << std::endl;

    std::cout << badlyFormattedFunction(1,2,3) << std::endl;
    std::cout << calculateSum(4,5) << std::endl;

    nullPointerExamples();
    callWithNull();
    badBracePlacement();
    iteratorExamples();
    mixedIndentation();

    memoryLeakExample(10);

    int testVal = 42;
    nullPointerDereference(&testVal);

    std::cout << uninitializedVariable(true) << std::endl;

    BadlyFormattedStruct s;
    s.x=1;s.y=2;

    CombinedIssues combined;
    combined.setValue(&testVal);

    cStyleLoops();

    return 0;
}
