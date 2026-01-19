/**
 * Live Test C# File for Tier 2 Native Fixer Validation
 *
 * This file contains INTENTIONAL issues that should be fixed by various tiers:
 *
 * Tier 1 (dotnet-format):
 * - IDE0055: Formatting violations (spacing, indentation)
 * - SA1000: Keyword spacing issues
 * - SA1003: Symbol spacing issues
 * - SA1008: Opening parenthesis spacing
 * - SA1009: Closing parenthesis spacing
 * - SA1024: Colon spacing
 * - SA1025: Code should not contain multiple whitespace characters
 *
 * Tier 2 (dotnet-format with code style):
 * - IDE0003/IDE0009: This qualification preferences
 * - IDE0007/IDE0008: Var usage preferences
 * - IDE0065: Using directive placement
 * - SA1200: Using directives placement
 *
 * Tier 3 (AI Required - Roslyn analyzers):
 * - CA1822: Member does not access instance data - can be static
 * - IDE0044: Make field readonly
 * - IDE0051: Remove unused private members
 * - IDE0059: Unnecessary assignment
 * - IDE0060: Remove unused parameter
 *
 * DO NOT manually fix these issues - they are test fixtures.
 */

using System;using System.Collections.Generic;using System.IO;using System.Linq;using System.Text;

namespace CodeQual.Fixtures
{
    // Tier 1 (IDE0055): Bad class formatting - poor brace placement
    public class TestClass{
        // Tier 3 (IDE0044): Field could be readonly
        private string _internalValue;
        private int _itemCount;

        // Tier 3 (IDE0051): Unused private field
        private int _unusedField = 42;

        // Tier 3 (IDE0051): Another unused private field
        private string _neverUsed = "test";

        // Tier 1 (SA1000, IDE0055): Missing space after keyword
        public TestClass(string value,int count){
            _internalValue=value;
            _itemCount=count;
        }

        // Tier 1 (IDE0055): Missing spaces around operators and after commas
        public int Calculate(int a,int b,int c){
            int result=a+b*c;
            return result;
        }

        // Tier 3 (CA1822): Method doesn't use instance data - should be static
        public int AddNumbers(int x, int y)
        {
            return x + y;
        }

        // Tier 3 (CA1822): Another method that should be static
        public string FormatMessage(string message)
        {
            return $"[LOG] {message}";
        }

        // Tier 3 (CA1822): Method with no instance access
        public bool IsValidEmail(string email)
        {
            return email.Contains("@") && email.Contains(".");
        }

        // Tier 1 (SA1000): Missing space after 'if' keyword
        public bool IsListEmpty(List<string> items)
        {
            if(items == null)
            {
                return true;
            }
            if(items.Count==0){return true;}
            return false;
        }

        // Tier 1 (IDE0055): Inconsistent indentation
        public void BadIndentation()
        {
        int a = 1;
          int b = 2;
              int c = 3;
                Console.WriteLine(a + b + c);
        }

        // Tier 1 (SA1025): Multiple whitespace characters
        public void   MultipleSpaces(string    input)
        {
            var    result    =    input.Trim();
            Console.WriteLine(result);
        }

        // Tier 3 (IDE0060): Unused parameter 'unused'
        public void ProcessData(string data, int unused)
        {
            Console.WriteLine($"Processing: {data}");
            // 'unused' parameter is never used
        }

        // Tier 3 (IDE0060): Multiple unused parameters
        public int Compute(int value, string label, bool flag, int extra)
        {
            // Only 'value' is used, others are unused
            return value * 2;
        }

        // Tier 3 (IDE0059): Unnecessary value assignment
        public string ReadFile(string path)
        {
            string content = "";  // IDE0059: Initial assignment is unnecessary
            content = File.ReadAllText(path);
            return content;
        }

        // Tier 3 (IDE0059): Multiple unnecessary assignments
        public int ComputeScore(int baseScore)
        {
            int result = 0;  // IDE0059: Unnecessary assignment
            int bonus = 10;  // IDE0059: Unnecessary - always overwritten
            bonus = baseScore > 50 ? 20 : 5;
            result = baseScore + bonus;
            return result;
        }

        // Tier 1 (SA1008, SA1009): Bad parenthesis spacing
        public void ParenthesisSpacing( string input ,int count )
        {
            if ( input != null )
            {
                for ( int i = 0 ; i < count ; i++ )
                {
                    Console.WriteLine( input );
                }
            }
        }

        // Tier 1 (IDE0055): Cramped braces and operators
        public Dictionary<string,int>GetScores(){
            var scores=new Dictionary<string,int>();
            scores["alice"]=100;scores["bob"]=95;scores["charlie"]=90;
            return scores;
        }

        // Tier 1 (SA1024): Bad colon spacing in ternary
        public string GetStatus(bool active)
        {
            return active?"Active":"Inactive";
        }

        // Tier 3 (CA1822): Static candidate with complex logic
        public List<int> FilterEvenNumbers(List<int> numbers)
        {
            var result = new List<int>();
            foreach (var num in numbers)
            {
                if (num % 2 == 0)
                {
                    result.Add(num);
                }
            }
            return result;
        }

        // Tier 1 (IDE0055): Bad for loop formatting
        public void BadLoopFormatting()
        {
            for(int i=0;i<10;i++){Console.WriteLine(i);}
        }

        // Tier 1 (IDE0055): Mixed bad formatting
        public void MixedIssues(string input,int count,bool flag){
            if(flag){
                for(int i=0;i<count;i++){
                    Console.WriteLine(input+":"+i);
                }
            }else{
                Console.WriteLine("No output");
            }
        }

        // Tier 3 (IDE0051): Unused private method
        private void UnusedHelper()
        {
            Console.WriteLine("This method is never called");
        }

        // Tier 3 (IDE0051): Another unused private method
        private int ComputeUnused(int x)
        {
            return x * x;
        }

        // Tier 3 (CA1822): Should be static - no instance access
        public void LogMessage(string message, string level)
        {
            var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            Console.WriteLine($"[{timestamp}] [{level}] {message}");
        }

        // Tier 1 (SA1003): Bad operator spacing
        public int BadOperatorSpacing(int a, int b)
        {
            return a+b*2-1/3;
        }

        // Tier 3 (IDE0059): Assigned but never read
        public void UnnecessaryAssignments()
        {
            int x = 10;  // OK - used below
            int y = 20;  // IDE0059 - assigned but overwritten
            y = x * 2;   // y is now used
            int z = 30;  // IDE0059 - assigned but never read
            Console.WriteLine($"x={x}, y={y}");
            // z is never used
        }

        // Property getter - uses instance field
        public string Value => _internalValue;

        // Property getter - uses instance field
        public int ItemCount => _itemCount;
    }

    // Tier 1 (IDE0055): Entire class with bad formatting
    public class BadlyFormattedClass{
    private int _value;
    public BadlyFormattedClass(int value){_value=value;}
    public int GetValue(){return _value;}
    public void SetValue(int value){_value=value;}
    }

    // Tier 3 (CA1822): Utility class where all methods should be static
    public class UtilityClass
    {
        // Tier 3 (CA1822): Should be static
        public string Reverse(string input)
        {
            return new string(input.Reverse().ToArray());
        }

        // Tier 3 (CA1822): Should be static
        public bool IsPalindrome(string input)
        {
            var clean = input.ToLower().Replace(" ", "");
            var reversed = new string(clean.Reverse().ToArray());
            return clean == reversed;
        }

        // Tier 3 (CA1822): Should be static
        public int Factorial(int n)
        {
            if (n <= 1) return 1;
            return n * Factorial(n - 1);
        }
    }

    // Main program entry point
    class Program{
        static void Main(string[] args){
            var test=new TestClass("hello",5);
            Console.WriteLine(test.Calculate(1,2,3));
            Console.WriteLine(test.AddNumbers(10,20));
            Console.WriteLine(test.Value);
        }
    }
}
