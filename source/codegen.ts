//source/codegen.ts
import { Tree, TreeNode } from "./tree.js";
import { SymbolTable } from "./symbolTable.js";

export class CodeGenerator {
    ast: Tree;
    symbolTable: SymbolTable;
    executable: string[] = []; //256 bytes of memory

    //memory pointers
    codePointer: number = 0; // points to next open spot in executable
    heapPointer: number = 255; // strings start from the end of memory and grow downwards

    staticTable: Map<string, string> = new Map();
    typeTable: Map<string, string> = new Map();
    tempCount: number = 0;
    jumpCount: number = 0;

    codeLog: string[] = [];

    constructor(ast: Tree, symbolTable: SymbolTable) {
        this.ast = ast;
        this.symbolTable = symbolTable;

        // initialize all memory to 00
        for (let i = 0; i < 256; i++) {
            this.executable.push("00");
        }
    }

    private log(message:string): void {
        this.codeLog.push(`DEBUG CodeGen - ${message}`);
    }

    //stack overflow kill switch
    private errorFound: boolean = false;

    //entry point for phase 4
    public generate(): void {
        this.log("Starting code generation...");
        this.errorFound = false;

        this.symbolTable.currentScope = -1;

        //start recursive ast traversal
        if (this.ast.root) {
            this.generateNode(this.ast.root);
        }

        //stop if we crashed
        if (this.errorFound) return;

        //when ast is fully traversed add the hex code for BRK
        this.addInstruction("00");

        //backpatching
        this.log("Starting backpatching...");
        this.backpatch();

        this.log("Code Generation Complete.");
    }

    //replace temporary placeholders with actual addresses
    private backpatch(): void {
        //loop through all variables created
        for (let i = 0; i < this.tempCount; i++) {
            if (this.codePointer >= this.heapPointer) {
                this.log("CODEGEN ERROR: Stack Overflow! Static variables collided with heap.");
                this.errorFound = true;
                return;
            }
            
            let tempId = "T" + i;

            //real address is where code pointer is
            let realAddress = this.codePointer.toString(16).toUpperCase().padStart(2, "0");

            //go through the memory array
            for (let j = 0; j < this.executable.length; j++) {
                if (this.executable[j] === tempId) {
                    //replace temp with real address
                    this.executable[j] = realAddress;

                    //next byte is XX, replace it with 00
                    this.executable[j + 1] = "00";
                }
            }

            this.log(`Backpatched [${tempId}] to physical address [${realAddress}]`);

            //increment code pointer so next variable gets a different address
            this.codePointer++;
        }
    }

    //take string from ast put in heap and return hex address
    private addString(value: string): string {
        //get rid of quotes from ast node
        let str = value.replace(/"/g, "");

        //check if adding string will hit code
        if (this.heapPointer - (str.length + 1) <= this.codePointer) {
            this.log("CODEGEN ERROR: Stack Overflow! String heap collided with code.");
            this.errorFound = true;
            return "00";
        }

        //strings must be 00-terminated
        this.executable[this.heapPointer] = "00";
        this.heapPointer--;

        //loop back through string
        for (let i = str.length - 1; i >=0; i--) {
            let hexCode = str.charCodeAt(i).toString(16).toUpperCase();
            this.executable[this.heapPointer] = hexCode;
            this.heapPointer--;
        }

        //add 1 to get back to starting address
        let startAddress = (this.heapPointer + 1).toString(16).toUpperCase().padStart(2, "0");
        return startAddress;
    }

    private generateNode(node: TreeNode): void {
        let name = node.name;

        if (name === "Block") {
            this.symbolTable.enterScope();
            for (let child of node.children) {
                this.generateNode(child);
            }
            this.symbolTable.exitScope();
        }
        else if (name === "VarDecl") {
            // vardecl has 2 children, type and id
            let varType = node.children[0].name;
            let varId = node.children[1].name;

            //make a temp addresss
            let tempAddress = "T" + this.tempCount;
            this.tempCount++;

            let sym = this.symbolTable.lookupSymbol(varId);
            if (sym) {
                sym.tempAddress = tempAddress;
            }

            //save it in static table
            this.staticTable.set(varId, tempAddress);
            //save the type in type table
            this.typeTable.set(varId, varType);

            //generate 6502 code
            //initialize variable to 0
            //LDA 00
            this.addInstruction("A9"); // LDA
            this.addInstruction("00"); // value 0

            //STA tempAddress
            this.addInstruction("8D"); // STA
            this.addInstruction(tempAddress); // address
            this.addInstruction("XX");

            this.log(`Generated code for VarDecl: [${varId}] initialized and mapped to ${tempAddress}`);
        }
        else if (name === "Assign") {
            let targetId = node.children[0].name;
            let sym = this.symbolTable.lookupSymbol(targetId);
            let tempAddress = sym!.tempAddress;
            //let tempAddress = this.staticTable.get(targetId)!;
            let exprNode = node.children[1];

            //assigning a single digit
            if (exprNode.isLeaf && /^[0-9]$/.test(exprNode.name)) {
                let hexValue = "0" + exprNode.name; // convert digit to hex

                this.addInstruction("A9"); // LDA
                this.addInstruction(hexValue); // value

                this.addInstruction("8D"); // STA
                this.addInstruction(tempAddress);
                this.addInstruction("XX");

                this.log(`Generated code for Assign: ${targetId} = ${exprNode.name}`);

            }

            //assigning a string
            else if (exprNode.isLeaf && exprNode.name.startsWith('"')) {
                //put the strinng on the heap and get starting address
                let stringAddress = this.addString(exprNode.name);

                this.addInstruction("A9"); //LDA
                this.addInstruction(stringAddress);

                this.addInstruction("8D") //STA
                this.addInstruction(tempAddress);
                this.addInstruction("XX");

                this.log(`Generated code for Assign: String ${exprNode.name} stored on heap at ${stringAddress}`)
            }

            //assigning addition operation
            else if (exprNode.name === "Plus") {

                //use helper function for addition
                let finalMathAddress = this.processAddition(exprNode);

                //load final answer from temp address of helper
                this.addInstruction("AD"); // LDA
                this.addInstruction(finalMathAddress);
                this.addInstruction("XX");

                //store in target variable
                this.addInstruction("8D"); // STA
                this.addInstruction(tempAddress);
                this.addInstruction("XX");
                

                this.log(`Generated code for Assign: Addition stored in [${targetId}]`);
            }

            //assigning a boolean value
            else if (exprNode.isLeaf && (exprNode.name === "true" || exprNode.name === "false")) {
                //if true it's 1, otherwise it would be 0 (false)
                let hexValue = exprNode.name === "true" ? "01" : "00";

                this.addInstruction("A9"); //LDA constant
                this.addInstruction(hexValue);

                this.addInstruction("8D") //STA
                this.addInstruction(tempAddress);
                this.addInstruction("XX")

                this.log(`Generated code for Assign: ${targetId} = ${exprNode.name}`)
            }
        }
        else if (name === "Print") {
            let exprNode = node.children[0];

            //printing integer
            if (exprNode.isLeaf && /^[a-z]$/.test(exprNode.name)) {
                // let tempAddress = this.staticTable.get(exprNode.name)!;

                // //ask type table what type of variable
                // let varType = this.typeTable.get(exprNode.name)!;
                let sym = this.symbolTable.lookupSymbol(exprNode.name);
                let tempAddress = sym!.tempAddress;
                let varType = sym!.type;

                this.addInstruction("AC"); // LDY
                this.addInstruction(tempAddress);
                this.addInstruction("XX");

                this.addInstruction("A2"); // LDX

                //if int or boolean, x = 01, if string x = 02
                if (varType === "int" || varType === "boolean") {
                    this.addInstruction("01");
                } else if (varType === "string") {
                    this.addInstruction("02");
                }

                this.addInstruction("FF"); // SYS call

                this.log(`Generated code for Print: ${varType} variable [${exprNode.name}] printed`);
            }

            //printing a string
            else if (exprNode.isLeaf && exprNode.name.startsWith('"')) {
                //put string on heap and get starting add
                let stringAddress = this.addString(exprNode.name);

                //load y reg with constant address of string
                this.addInstruction("A0"); //LDY constant
                this.addInstruction(stringAddress);

                //load X reg with 02 for string printing
                this.addInstruction("A2"); //LDX
                this.addInstruction("02");

                this.addInstruction("FF"); //SYS call

                this.log(`Generated code for Print: raw string ${exprNode.name} printed`);

            }
        }
        else if (name === "If") {
            //first child is condition, and second is the block
            let conditionNode = node.children[0];
            let blockNode = node.children[1];

            if (conditionNode.name === "==" || conditionNode.name === "!=") {
                let leftNode = conditionNode.children[0];  
                let rightNode = conditionNode.children[1];
                
                // let sym = this.symbolTable.lookupSymbol(leftVar);
                // let condAddress = sym!.tempAddress;

                let condAddress = "";

                if (leftNode.name === "Plus") {
                    condAddress = this.processAddition(leftNode);
                }

                //var or literal
                if (/^[a-z]$/.test(leftNode.name)) {
                    let sym = this.symbolTable.lookupSymbol(leftNode.name);
                    condAddress = sym!.tempAddress;
                }
                else {
                    //its a literal store in memory
                    condAddress = "T" + this.tempCount;
                    this.tempCount++;

                    this.addInstruction("A9"); //LDA
                    if (/^[0-9]$/.test(leftNode.name)) {
                        this.addInstruction("0" + leftNode.name);
                    } else {
                        this.addInstruction(leftNode.name === "true" ? "01" : "00");
                    }

                    this.addInstruction("8D"); // STA
                    this.addInstruction(condAddress);
                    this.addInstruction("XX");
                }

                // //load x reg with right side
                // this.addInstruction("A2"); // LDX
                // if (/^[0-9]$/.test(rightVal)) {
                //     this.addInstruction("0" + rightVal); //Load digit
                // } else {
                //     let hexValue = rightVal === "true" ? "01" : "00";
                //     this.addInstruction(hexValue); // Load boolean
                // }

                //resolve the right side
                if (rightNode.name === "Plus") {
                    let mathTemp = this.processAddition(rightNode);
                    this.addInstruction("AE"); // LDX from memory
                    this.addInstruction(mathTemp);
                    this.addInstruction("XX");
                } else if (/^[a-z]$/.test(rightNode.name)) {
                    let sym = this.symbolTable.lookupSymbol(rightNode.name);
                    this.addInstruction("AE"); // LDX from memory
                    this.addInstruction(sym!.tempAddress);
                    this.addInstruction("XX");
                } else if (/^[0-9]$/.test(rightNode.name)) {
                    this.addInstruction("A2"); // LDX constant
                    this.addInstruction("0" + rightNode.name);
                } else {
                    this.addInstruction("A2"); // LDX constant
                    this.addInstruction(rightNode.name === "true" ? "01" : "00");
                }

                //compare x to left variable
                this.addInstruction("EC"); // CPX
                this.addInstruction(condAddress);
                this.addInstruction("XX");


                let jumpIndex = 0;

                if (conditionNode.name === "==") {
                    //branch on not equal
                    this.addInstruction("D0"); //BNE

                    //add a placeholder for jump distance
                    let jumpId = "J" + this.jumpCount;
                    this.jumpCount++;
                    this.addInstruction(jumpId);
                    jumpIndex = this.codePointer - 1;
                }
                else if (conditionNode.name === "!=") {
                    //if not equal, jump 7 bytes forward
                    this.addInstruction("D0"); // BNE
                    this.addInstruction("07"); 

                    // If we fall through it is equal
                    this.addInstruction("A2"); // LDX
                    this.addInstruction("01"); 
                    this.addInstruction("EC"); // CPX
                    this.addInstruction("FF"); // Memory address 00FF
                    this.addInstruction("00"); 
                    this.addInstruction("D0"); // BNE

                    let jumpId = "J" + this.jumpCount;
                    this.jumpCount++;
                    this.addInstruction(jumpId);
                    jumpIndex = this.codePointer - 1;

                }

                //generate code
                this.generateNode(blockNode);

                //find jump distance
                let distance = this.codePointer - (jumpIndex + 1);
                let hexDistance = distance.toString(16).toUpperCase().padStart(2, "0");

                //backpatch jump distance
                this.executable[jumpIndex] = hexDistance;

                this.log(`Generated code for If Statement: Jump distance is ${hexDistance} bytes`);
            }
            //if true
            else if (conditionNode.name === "true") {
                //just run the code
                this.generateNode(blockNode);
                this.log(`Generated code for If Statement: 'true' literal, block executed normally`);
            }
            //if false
            else if (conditionNode.name === "false") {
                //force jump over the block
                this.addInstruction("A2"); // LDX
                this.addInstruction("01"); 
                this.addInstruction("EC"); // CPX
                this.addInstruction("FF"); 
                this.addInstruction("00");
                this.addInstruction("D0"); // BNE (Always branches)
                
                let exitJumpId = "J" + this.jumpCount;
                this.jumpCount++;
                this.addInstruction(exitJumpId); 
                let jumpIndex = this.codePointer - 1;

                //generate the block
                this.generateNode(blockNode);

                //backpatch the jump
                let distance = this.codePointer - (jumpIndex + 1);
                let hexDistance = distance.toString(16).toUpperCase().padStart(2, "0");
                this.executable[jumpIndex] = hexDistance;

                this.log(`Generated code for If Statement: 'false' literal, skipped forward ${hexDistance} bytes`);
            }
        }

        //while loops
        else if (name === "While") {
            let conditionNode = node.children[0];
            let blockNode = node.children[1];

            if (conditionNode.name === "==" || conditionNode.name === "!=") {
                let leftNode = conditionNode.children[0];  
                let rightNode = conditionNode.children[1]; 

                // let sym = this.symbolTable.lookupSymbol(leftVar);
                // let condAddress = sym!.tempAddress;
                let condAddress = "";

                if (leftNode.name === "Plus") {
                    condAddress = this.processAddition(leftNode);
                }

                //variable or literal
                if (/^[a-z]$/.test(leftNode.name)) {
                    let sym = this.symbolTable.lookupSymbol(leftNode.name);
                    condAddress = sym!.tempAddress;
                } else {
                    // store literal in memory
                    condAddress = "T" + this.tempCount;
                    this.tempCount++;

                    this.addInstruction("A9"); // LDA constant
                    if (/^[0-9]$/.test(leftNode.name)) {
                        this.addInstruction("0" + leftNode.name);
                    } else {
                        this.addInstruction(leftNode.name === "true" ? "01" : "00");
                    }
                    
                    this.addInstruction("8D"); // STA
                    this.addInstruction(condAddress);
                    this.addInstruction("XX");
                }

                //mark start of loop
                let loopStartIndex = this.codePointer;

                // //evaluate condition
                // this.addInstruction("A2"); // LDX
                // if (/^[0-9]$/.test(rightVal)) {
                //     this.addInstruction("0" + rightVal); // Load digit
                // } else {
                //     let hexValue = rightVal === "true" ? "01" : "00";
                //     this.addInstruction(hexValue); // Load boolean
                // }

                //resolve the right side
                if (rightNode.name === "Plus") {
                    let mathTemp = this.processAddition(rightNode);
                    this.addInstruction("AE"); // LDX from memory
                    this.addInstruction(mathTemp);
                    this.addInstruction("XX");
                } else if (/^[a-z]$/.test(rightNode.name)) {
                    let sym = this.symbolTable.lookupSymbol(rightNode.name);
                    this.addInstruction("AE"); // LDX from memory
                    this.addInstruction(sym!.tempAddress);
                    this.addInstruction("XX");
                } else if (/^[0-9]$/.test(rightNode.name)) {
                    this.addInstruction("A2"); // LDX constant
                    this.addInstruction("0" + rightNode.name);
                } else {
                    this.addInstruction("A2"); // LDX constant
                    this.addInstruction(rightNode.name === "true" ? "01" : "00");
                }

                this.addInstruction("EC"); // CPX
                this.addInstruction(condAddress);
                this.addInstruction("XX");

                let exitJumpIndex: number = 0;

                //escape when not equal
                if (conditionNode.name === "==") {
                    this.addInstruction("D0"); // BNE
                    let exitJumpId = "J" + this.jumpCount;
                    this.jumpCount++;
                    this.addInstruction(exitJumpId); 
                    exitJumpIndex = this.codePointer - 1;
                }
                else if (conditionNode.name === "!=") {
                    //if not equal, jump 7 bytes forward
                    this.addInstruction("D0"); // BNE
                    this.addInstruction("07"); // Skip 7 bytes

                    //only triggers if equal
                    // use this to jump out of the look
                    this.addInstruction("A2"); // LDX
                    this.addInstruction("01"); 
                    this.addInstruction("EC"); // CPX
                    this.addInstruction("FF"); 
                    this.addInstruction("00"); 
                    this.addInstruction("D0"); // BNE
                    
                    let exitJumpId = "J" + this.jumpCount;
                    this.jumpCount++;
                    this.addInstruction(exitJumpId); 
                    exitJumpIndex = this.codePointer - 1;
                
                }

                //generate code
                this.generateNode(blockNode);

                //make jump happen by comparing 1 to the last address
                this.addInstruction("A2"); // LDX
                this.addInstruction("01"); 
                this.addInstruction("EC"); // CPX
                this.addInstruction("FF"); // Memory address 00FF
                this.addInstruction("00");

                this.addInstruction("D0"); // BNE

                //calculate the backwards jump
                let currentOffset = this.codePointer + 1; 
                let backwardDistance = currentOffset - loopStartIndex;
                let hexBackward = (256 - backwardDistance).toString(16).toUpperCase().padStart(2, "0");
                this.addInstruction(hexBackward);

                //backpatch the jump
                let forwardDistance = this.codePointer - (exitJumpIndex + 1);
                let hexForward = forwardDistance.toString(16).toUpperCase().padStart(2, "0");
                this.executable[exitJumpIndex] = hexForward;

                this.log(`Generated code for While Loop: Rewinds ${hexBackward}, Exits forward ${hexForward}`);
            }
            
            //for infinite loops
            else if (conditionNode.name === "true") {
                let loopStartIndex = this.codePointer;

                //generate the block
                this.generateNode(blockNode);

                //force jump backwards
                this.addInstruction("A2"); // LDX
                this.addInstruction("01"); 
                this.addInstruction("EC"); // CPX
                this.addInstruction("FF"); // Memory address 00FF (contains 00)
                this.addInstruction("00");
                this.addInstruction("D0"); // BNE (Always branches)

                let currentOffset = this.codePointer + 1; 
                let backwardDistance = currentOffset - loopStartIndex;
                let hexBackward = (256 - backwardDistance).toString(16).toUpperCase().padStart(2, "0");
                this.addInstruction(hexBackward);

                this.log(`Generated code for While Loop: Infinite loop rewinds ${hexBackward} bytes`);
            }

            //dead loop
            else if (conditionNode.name === "false") {
                //force jump over block
                this.addInstruction("A2"); // LDX
                this.addInstruction("01"); 
                this.addInstruction("EC"); // CPX
                this.addInstruction("FF"); 
                this.addInstruction("00");
                this.addInstruction("D0"); // BNE (Always branches)
                
                let exitJumpId = "J" + this.jumpCount;
                this.jumpCount++;
                this.addInstruction(exitJumpId); 
                let exitJumpIndex = this.codePointer - 1;

                //generate block
                this.generateNode(blockNode);

                //backpatch jump
                let forwardDistance = this.codePointer - (exitJumpIndex + 1);
                let hexForward = forwardDistance.toString(16).toUpperCase().padStart(2, "0");
                this.executable[exitJumpIndex] = hexForward;

                this.log(`Generated code for While Loop: Dead loop skipped forward ${hexForward} bytes`);
            }
        }

        else {
            for (let child of node.children) {
                this.generateNode(child);
            }
        }
    }

    // add hex command to memory
    private addInstruction(hex: string): void {
        if (this.errorFound) return;
        
        if (this.codePointer >= this.heapPointer) {
            this.log("CODEGEN ERROR: Stack Overflow! No more memory available to generate code.");
            return;
        }
        this.executable[this.codePointer] = hex;
        this.codePointer++;
    }

    //help chained addition
    private processAddition(exprNode: TreeNode): string {
        let leftNode = exprNode.children[0];
        let rightNode = exprNode.children[1];

        //give addition temp spot in memory
        let mathTemp = "T" + this.tempCount;
        this.tempCount++;

        //resolve right side
        if (rightNode.name === "Plus") {
            let mathTemp = this.processAddition(rightNode);
            this.addInstruction("AD"); // LDA memory
            this.addInstruction(mathTemp);
            this.addInstruction("XX");
        }
        // else if (/^[a-z]$/.test(rightNode.name)) {
        //     //Handle variables on the right side
        //     let sym = this.symbolTable.lookupSymbol(rightNode.name);
        //     this.addInstruction("AE"); 
        //     this.addInstruction(sym!.tempAddress);
        //     this.addInstruction("XX");

        // } 
        else if (/^[0-9]$/.test(rightNode.name)) {
            this.addInstruction("A9"); // LDA constant
            this.addInstruction("0" + rightNode.name);
        } 
        else {
            // It's a variable
            let sym = this.symbolTable.lookupSymbol(rightNode.name);
            let rightAddr = sym!.tempAddress;
            this.addInstruction("AD"); // LDA memory
            this.addInstruction(rightAddr);
            this.addInstruction("XX");
        }

        //store right side into temp
        this.addInstruction("8D"); // STA
        this.addInstruction(mathTemp);
        this.addInstruction("XX");

        //resolve left side
        this.addInstruction("A9"); // LDA constant
        this.addInstruction("0" + leftNode.name);

        //add together
        this.addInstruction("6D"); // ADC
        this.addInstruction(mathTemp);
        this.addInstruction("XX");

        //save result
        this.addInstruction("8D"); // STA
        this.addInstruction(mathTemp);
        this.addInstruction("XX");

        //return where answer is saved
        return mathTemp;
    }

    //format the memory array into a string for output
    public getExecutableString(): string {

        //if we crashed, don't return any machine code
        if (this.errorFound) {
            return "COMPILATION ERROR: Memory limit exceeded (256 bytes). Machine Code not generated."; 
        }

        let output = "";
        for (let i = 0; i < this.executable.length; i++) {
            output += this.executable[i] + " ";
        }
        return output.trim();
    }
}