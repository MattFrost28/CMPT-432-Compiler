# Compiler - Comprehensive Tests

This document outlines the rigorous testing methodology applied by my compiler. Tests are categorized by compilation phase, ensuring complete coverage of lexical, syntactic, and semantic rules, alongside memory constraints and complex edge cases.

---

## 1. Lexical Analysis
The Lexical Analyzer reads the source character stream and groups it into valid tokens while discarding whitespace and comments.

### 🟢 Valid Lexical Streams
* **Clean Lex:** `{ int a a = 5 /* initialization */ } $`
  * *Result:* Successfully ignores the block comment and whitespace, generating a valid token stream.

### 🔴 Lexical Errors
* **Unidentified Character:** `{ int a a = 1 print(a) @#% }$` 
  * *Result:* Halts and identifies illegal characters `@#%`.
* **Illegal Operator:** `{ int a a = 1 print(a^b) }$`
  * *Result:* Halts at `^`, as bitwise/exponentiation is not supported in the formal grammar.

### 🟡 Lexical Warnings
* **Unterminated String:** `{ string a a = "unterminated }$`
  * *Result:* Reaches EOP while inside a quote block.
* **Unterminated Comment:** `{ int a /* this never ends a = 1 }$`
  * *Result:* Warns that the comment block was never closed before EOP.
* **Missing EOP Symbol:** `{ int a a = 1 print(a) }`
  * *Result:* Warns that the file ended before the required `$` terminator was found.

---

## 2. Syntax Analysis
The Parser verifies that the generated token stream adheres strictly to the formal grammar of the language.

### 🟢 Valid Syntax
* **Deeply Nested Blocks:** `{ { { int a } } } $`
  * *Result:* Parser successfully builds a Concrete Syntax Tree (CST) with properly nested `<Block>` nodes.

### 🔴 Parse Errors
* **Double Type Declaration:** `{ int int a }$`
  * *Result:* Fails on the second `int`, expecting an `<Id>`.
* **Missing Expression:** `{ int a a = }$`
  * *Result:* Fails expecting an `<Expr>` after the assignment operator.
* **Missing Terminator/Paren:** `{ print( }$`
  * *Result:* Fails expecting an `<Expr>` or `<Id>` inside the print statement.
* **Malformed Control Flow:** `{ while (a == 1) }$`
  * *Result:* Fails expecting a `<Block>` `{...}` after the while condition.
* **Missing Scope Brace:** `{ if (a == b) { print(a) }$`
  * *Result:* Fails expecting a closing `}` for the `if` block.
* **Illegal Initialization:** `{ int a = 1 }$`
  * *Result:* Fails. Grammar dictates variable declaration and assignment must be separate statements.
* **Illegal Statement:** `{ (a == b) }$`
  * *Result:* Fails. A boolean expression cannot stand alone as a statement.

---

## 3. Semantic Analysis
The Semantic phase enforces scope, type checking, and logical validity, generating QoL warnings for developers.

### 🔴 Semantic Errors (Type & Scope)
* **Redeclaration:** `{ int a int a }$`
  * *Result:* Fatal error: `a` already declared in the current scope.
* **Undeclared Usage:** `{ int a a = b }$`
  * *Result:* Fatal error: Variable `b` used before declaration.
* **Type Mismatch (Assignment):** `{ int a string b a = b }$`
  * *Result:* Fatal error: Cannot assign `string` to type `int`.
* **Type Mismatch (Literal Assignment):** `{ int a a = "hello" }$`
  * *Result:* Fatal error: Cannot assign a string literal to an integer.
* **Type Mismatch (Comparison):** `{ int a if (a == true) { print(a) } }$`
  * *Result:* Fatal error: Cannot compare `int` to `boolean`.
* **Scope Violation:** `{ int a a = 1 { int b b = 2 } print(b) }$`
  * *Result:* Fatal error: Variable `b` is out of scope at the time of printing.

### 🟡 Semantic Warnings & Hints
* **Unused Variable:** `{ int a }$`
  * *Result:* Hint generated: Variable declared but never utilized.
* **Uninitialized Usage:** `{ int a print(a) }$`
  * *Result:* Warning generated: Variable printed before initialization.
* **Assigned but Unused:** `{ int a a = 1 }$`
  * *Result:* Warning generated: Variable initialized but never used elsewhere in the program.

---

## 4. Code Generation & Memory Management
Tests physical machine code translation, relative branching offsets, and stack/heap limitations.

### 🟢 Code Generation Successes
* **Heap Memory & String Pointers:** `{ print("success") print("done") } $`
  * *Result:* Strings correctly loaded at the end of memory (starting at `$00FF` and growing downward), separated by `00` terminators.
* **Branching Edge Case (Double Jump Hack):** `{ int b b = 0 while (b != 3) { print(b) b = 1 + b } } $`
  * *Result:* Uses the `D0 07` skip hack to bypass the escape hatch, and Two's Complement math to jump perfectly backward.

### 🔴 Code Generation Errors
* **Stack Overflow (Memory Exhaustion):**
  `
  {
  /* DECLARE MANY VARIABLES TO OCCUPY STATIC TABLE AND CODE SPACE */
  int a int b int c int d int e int f int g int h int i int j
  int k int l int m int n int o int p int q int r int s int t

  /* INITIALIZE VARIABLES TO PUSH THE CODE POINTER UPWARD */
  a=1 b=1 c=1 d=1 e=1 f=1 g=1 h=1 i=1 j=1
  k=1 l=1 m=1 n=1 o=1 p=1 q=1 r=1 s=1 t=1

  /* USE A LONG, GRAMMAR-COMPLIANT STRING TO EXHAUST HEAP SPACE */
  print("this string is deliberately long and repetitive to ensure the heap pointer collides with the code pointer in memory resulting in a fatal stack overflow error for the compiler")
} $
  `
  * *Result:* Instruction space (growing up) collides with heap space (growing down), exceeding 256 bytes. Halts with Stack Overflow error.

  ---

## 5. Advanced Edge Cases
These test cases stress-test compiler logic regarding symbol table management, recursive AST traversal, and memory efficiency.

### 🟢 Scope Shadowing
* **Code:** `{ int a a=1 { int a a=2 { int a a=3 { int a a=4 print(a) } print(a) } print(a) } print(a) }$`
* **Expected Result:** Output should be `4 3 2 1`. This validates that the symbol table correctly manages variable shadowing across multiple nested scopes.

### 🟢 Deeply Nested Boolean Logic
* **Code:** `{ boolean a a=true boolean b b=false boolean c c=((a==true)!=(b==false)) print(c) }$`
* **Expected Result:** The compiler must correctly evaluate the nested `<IsEqual>` and `<NotEqual>` nodes and assign the resulting boolean value to `c`.

### 🟢 String Heap Deduplication
* **Code:** `{ print("static") print("static") print("static") }$`
* **Expected Result:** To optimize the 256-byte memory limit, the compiler should store the string "static" in the heap only once, pointing all three print calls to the same memory address.

### 🟢 Empty Block Processing
* **Code:** `{ { { { { } } } { } { } { { } } } }$`
* **Expected Result:** The compiler should successfully traverse and discard empty blocks during AST generation, resulting in an efficient executable with zero functional instructions.

### 🟢 Chained Arithmetic Operations
* **Code:** `{ int a a=1+1+1+1+1+1+1+1+1 print(a) }$`
* **Expected Result:** Validates that the Code Generator accurately manages the accumulator and temporary storage locations for nine consecutive additions.

### 🟢 Conditional Loop Bypass (Dead Loop)
* **Code:** `{ int a a=5 while(a!=5){ print(a) a=1+a } print(a) }$`
* **Expected Result:** The loop body must be skipped entirely as the initial condition is false; the program should only print `5`.

---

## 6. Literal Handling & Evaluation
These tests ensure that raw literals (integers, strings, and booleans) interact correctly with variables and control flow structures.

### 🟢 Direct Literal Printing
* **Code:** `{ print(0) print("terminal") print(true) }$`
* **Expected Result:** Validates the system call for printing various literal types directly from memory or the heap.

### 🟢 Literal Equality and Inequality
* **Code:** * `{ if(1==1){ print("equal") } }$`
  * `{ if(1!=2){ print("not equal") } }$`
* **Expected Result:** Validates that the compiler can compare two hardcoded constants without variable references.

### 🟢 String and Boolean Literal Comparisons
* **Code:** * `{ if("match"=="match"){ print("same") } }$`
  * `{ if(true!=false){ print("distinct") } }$`
* **Expected Result:** Validates type-specific comparison logic for heap-stored strings and boolean constants.

### 🟢 Arithmetic in Comparisons
* **Code:** `{ if(9==4+5){ print("nine") } }$`
* **Expected Result:** The compiler must evaluate the right-hand expression (`4+5`) before performing the comparison against the literal `9`.

### 🟢 Infinite Literal Loops
* **Code:** `{ int a a=0 while true { print(a) a=1+a } }$`
* **Expected Result:** Generates a valid unconditional loop where the condition always evaluates to true, omitting the standard escape hatch.

### 🟢 Constant Branching (False Condition)
* **Code:** `{ int a a=9 if false { print(a) } print(a) }$`
* **Expected Result:** The compiler must generate a jump that skips the `if` block entirely, resulting in only the final `9` being printed.