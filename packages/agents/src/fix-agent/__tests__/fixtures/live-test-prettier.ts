/**
 * Live Test Prettier File for Formatting Validation
 *
 * This file contains INTENTIONAL formatting issues that Prettier handles:
 *
 * Prettier handles (Tier 1):
 * - printWidth: Long lines that need wrapping
 * - tabWidth/useTabs: Inconsistent indentation
 * - semi: Inconsistent semicolons
 * - singleQuote: Mixed quote styles
 * - trailingComma: Missing trailing commas
 * - bracketSpacing: Inconsistent object spacing
 * - arrowParens: Inconsistent arrow function parentheses
 * - endOfLine: Inconsistent line endings
 *
 * ESLint handles (Tier 1):
 * - @typescript-eslint/no-explicit-any: Type issues (NOT formatting)
 * - @typescript-eslint/no-unused-vars: Unused variables (NOT formatting)
 *
 * This file specifically tests Prettier's formatting capabilities
 * separately from ESLint's rule-based linting.
 *
 * DO NOT manually fix these issues - they are test fixtures.
 */

// Issue: Long lines (printWidth violation) - Prettier will wrap these
const VERY_LONG_CONFIG_STRING_THAT_EXCEEDS_PRINT_WIDTH = "This is an extremely long string that definitely exceeds the default print width of 80 characters and should be wrapped by Prettier"
const ANOTHER_LONG_CONFIG_WITH_MANY_PROPERTIES = {name: "config", value: 123, description: "This is another very long line that contains too many properties on a single line and needs formatting"};

// Issue: Inconsistent quote styles - Prettier normalizes these
const MESSAGE_DOUBLE = "Hello World"
const MESSAGE_SINGLE = 'Hello World'
const MIXED_QUOTES_OBJ = {key1: "value1", key2: 'value2', key3: "value3", key4: 'value4'}

// Issue: Missing semicolons (when semi: true configured)
const NO_SEMI_1 = "test value"
const NO_SEMI_2 = 42
const NO_SEMI_3 = true

// Issue: Inconsistent bracket spacing
const NO_SPACING = {a:1,b:2,c:3}
const EXTRA_SPACING = {  a: 1,  b: 2,  c: 3  }
const MIXED_SPACING = { a:1,b: 2, c:3}

// Issue: Missing trailing commas in multiline structures
const CONFIG_NO_TRAILING_COMMA = {
    host: "localhost",
    port: 3000,
    secure: false,
    timeout: 5000
}

const ARRAY_NO_TRAILING_COMMA = [
    "item1",
    "item2",
    "item3",
    "item4"
]

// Issue: Arrow function parens inconsistency
const noParens = x => x * 2
const withParens = (y) => y * 3
const multiParam = (a, b) => a + b

// Issue: Inconsistent indentation (tabs vs spaces, wrong indent level)
function badlyIndentedFunction() {
   const x = 1  // 3 spaces
    const y = 2  // 4 spaces
  const z = 3   // 2 spaces
	const w = 4   // Tab character
    return x + y + z + w
}

// Issue: Object property shorthand and spacing
const name = "test"
const value = 123
const longhandObject = {name: name, value: value, extra: "data"}

// Issue: Multiple statements on one line (Prettier separates)
function multipleStatements() {const a = 1; const b = 2; const c = 3; return a + b + c}

// Issue: JSX-like formatting issues (object expressions)
const ComponentConfig = {type: "Button",props: {onClick: () => console.log("clicked"),style: {color: "blue",fontSize: 14}},children: ["Click me"]}

// Issue: Nested object formatting
const deepNested = {level1: {level2: {level3: {level4: {level5: "deep value", anotherKey: "another value"}}}}}

// Issue: Array of objects formatting
const arrayOfObjects = [{id: 1, name: "first"},{id: 2, name: "second"},{id: 3, name: "third"},{id: 4, name: "fourth"}]

// Issue: Function parameter formatting (too many on one line)
function manyParams(param1: string, param2: number, param3: boolean, param4: object, param5: string[], param6: number) {return param1 + String(param2)}

// Issue: Ternary operator formatting
const ternaryResult = someCondition ? "this is the truthy value that is very long and should be formatted" : "this is the falsy value that is also very long"
let someCondition = true

// Issue: Template literal formatting
const template = `This is a template literal with ${VERY_LONG_CONFIG_STRING_THAT_EXCEEDS_PRINT_WIDTH} interpolation that exceeds line width`

// Issue: Chained method calls (Prettier wraps these)
const chainedResult = ["a","b","c","d","e"].map(item => item.toUpperCase()).filter(item => item !== "A").reduce((acc, item) => acc + item, "")

// Issue: Import/export grouping and spacing
export{MESSAGE_DOUBLE,MESSAGE_SINGLE,NO_SEMI_1,CONFIG_NO_TRAILING_COMMA,badlyIndentedFunction,manyParams}

// Issue: Class formatting
class BadlyFormattedClass {private x: number;constructor(x: number){this.x = x}getX(){return this.x}setX(val: number){this.x = val}calculate(a: number,b: number,c: number){return a*b+c}}

// Issue: Type annotation spacing
type BadType = {prop1:string;prop2:number;prop3:boolean}
interface BadInterface {method1():void;method2(arg:string):number}

// Issue: Async/await formatting
async function badlyFormattedAsync() {const result = await fetch("https://api.example.com/data");const json = await result.json();return json}

// Issue: Switch statement formatting
function switchStatement(val: string) {switch(val){case "a":return 1;case "b":return 2;case "c":return 3;default:return 0}}

// Issue: Object destructuring formatting
const {prop1:renamed1,prop2:renamed2,prop3:renamed3} = {prop1: "a", prop2: "b", prop3: "c"}

// Issue: Array destructuring formatting
const [first,second,third,...rest] = [1,2,3,4,5,6,7,8]

// Issue: Function with default parameters formatting
function withDefaults(a: string = "default1",b: number = 42,c: boolean = true,d: string[] = ["item"]) {return {a,b,c,d}}
