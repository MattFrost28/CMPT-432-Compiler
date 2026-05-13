# 🚀 TypeScript 6502 Compiler

**Author:** Matt Frost
**Course:** CMPT-432  
**Target Architecture:** 6502 Machine Code

## 📖 Overview
This project is a fully functional, multi-pass compiler written in **TypeScript**. It translates a custom, high-level curly-brace language into raw 6502 machine code executable in a 256-byte virtual environment. 

The compiler strictly enforces lexical scoping, static typing, and memory constraints, featuring a robust architecture divided into four distinct phases: Lexical Analysis, Parsing, Semantic Analysis, and Code Generation.

---

## ✨ Key Features & Edge Cases Handled

This compiler doesn't just translate code; it actively protects the target hardware and optimizes execution. Highlights include:

* **Advanced Lexical Scoping:** Fully supports variable shadowing across infinitely nested `{ }` blocks. The Symbol Table and Code Generator remain perfectly synchronized using dynamic temporary memory allocation (`T_x` resolution).
* **The "Kill Switch" (Memory Protection):** The target 6502 emulator is strictly limited to 256 bytes of memory. The Code Generator actively monitors the `codePointer` (growing upward) and the `heapPointer` (growing downward). If they collide, compilation is instantly aborted to prevent a catastrophic Stack Overflow and binary corruption.
* **Universal Condition Resolution:** Evaluates expressions flawlessly, regardless of type. The compiler correctly handles `if(a == b)`, `while(1 != 2)`, and even mathematically dense literals like `if(9 == 4+5)` using the `AE` (LDX Absolute) opcode.
* **Control Flow Mastery (The "Double Jump" Hack):** Solves the 6502 `BEQ` hardware limitation natively. The compiler accurately computes Two's Complement hexadecimal offsets to generate functional unconditional branches (`while true`), forward branches (`if false`), and conditional loops.
* **Recursive Chained Addition:** Dynamically traverses deeply nested AST `Plus` nodes to calculate infinitely chained addition sequences (e.g., `a = 1+1+1+1...`) while safely managing the Accumulator and temporary system memory.

---

## 🏗️ Compiler Architecture

### Phase 1: Lexical Analysis (Scanner)
Reads the raw source code and converts characters into a stream of valid Tokens. It aggressively filters out illegal characters, spaces, and comments, generating comprehensive warnings and fatal errors with exact line and column coordinates.

### Phase 2: Syntax Analysis (Parser)
Consumes the token stream and verifies it against the formal language grammar using Recursive Descent Parsing. It constructs a **Concrete Syntax Tree (CST)** to visually represent the exact structure of the programmer's input.

### Phase 3: Semantic Analysis
Traverses the CST to build a streamlined **Abstract Syntax Tree (AST)**. During this phase, the compiler:
1. Enforces strict type-checking (e.g., preventing `int a = "hello"`).
2. Manages the Symbol Table and verifies variable declarations.
3. Generates professional warnings for uninitialized variables and hints for declared-but-unused variables.

### Phase 4: Code Generation
The final pass. It walks the AST to emit functional 6502 machine code. It maps variables to physical memory, allocates static strings to the heap, and performs backpatching to resolve temporary branch jumps (`J_x`) and variable locations (`T_x`) into static hexadecimal addresses.

---

## 🛠️ Setup & Installation

Ensure you have [Node.js](https://nodejs.org/) and TypeScript installed on your machine.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MattFrost28/CMPT-432-Compiler
   cd CMPT-432-Compiler
   ```
2. **Install Dependencies:**
    ```bash
    npm install
    ```