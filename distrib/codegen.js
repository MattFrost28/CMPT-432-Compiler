export class CodeGenerator {
    constructor(ast, symbolTable) {
        this.executable = []; //256 bytes of memory
        //memory pointers
        this.codePointer = 0; // points to next open spot in executable
        this.heapPointer = 255; // strings start from the end of memory and grow downwards
        this.staticTable = new Map();
        this.typeTable = new Map();
        this.tempCount = 0;
        this.jumpCount = 0;
        this.codeLog = [];
        //stack overflow kill switch
        this.errorFound = false;
        this.ast = ast;
        this.symbolTable = symbolTable;
        // initialize all memory to 00
        for (let i = 0; i < 256; i++) {
            this.executable.push("00");
        }
    }
    log(message) {
        this.codeLog.push(`DEBUG CodeGen - ${message}`);
    }
    //entry point for phase 4
    generate() {
        this.log("Starting code generation...");
        this.errorFound = false;
        this.symbolTable.currentScope = -1;
        //start recursive ast traversal
        if (this.ast.root) {
            this.generateNode(this.ast.root);
        }
        //stop if we crashed
        if (this.errorFound)
            return;
        //when ast is fully traversed add the hex code for BRK
        this.addInstruction("00");
        //backpatching
        this.log("Starting backpatching...");
        this.backpatch();
        this.log("Code Generation Complete.");
    }
    //replace temporary placeholders with actual addresses
    backpatch() {
        //loop through all variables created
        for (let i = 0; i < this.tempCount; i++) {
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
    addString(value) {
        //get rid of quotes from ast node
        let str = value.replace(/"/g, "");
        //strings must be 00-terminated
        this.executable[this.heapPointer] = "00";
        this.heapPointer--;
        //loop back through string
        for (let i = str.length - 1; i >= 0; i--) {
            let hexCode = str.charCodeAt(i).toString(16).toUpperCase();
            this.executable[this.heapPointer] = hexCode;
            this.heapPointer--;
        }
        //add 1 to get back to starting address
        let startAddress = (this.heapPointer + 1).toString(16).toUpperCase().padStart(2, "0");
        return startAddress;
    }
    generateNode(node) {
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
            let tempAddress = sym.tempAddress;
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
                this.addInstruction("8D"); //STA
                this.addInstruction(tempAddress);
                this.addInstruction("XX");
                this.log(`Generated code for Assign: String ${exprNode.name} stored on heap at ${stringAddress}`);
            }
            //assigning addition operation
            else if (exprNode.name === "Plus") {
                let leftNode = exprNode.children[0];
                let rightNode = exprNode.children[1];
                //temporaruy spot in memory to hold the number
                let mathTemp = "T" + this.tempCount;
                this.tempCount++;
                //load right side into accumulator
                if (/^[0-9]$/.test(rightNode.name)) {
                    //load the number directly
                    this.addInstruction("A9"); //LDA
                    this.addInstruction("0" + rightNode.name);
                }
                else {
                    //it's a variable so look up the address
                    let sym = this.symbolTable.lookupSymbol(rightNode.name);
                    let rightAddr = sym.tempAddress;
                    this.addInstruction("AD"); //LDA
                    this.addInstruction(rightAddr);
                    this.addInstruction("XX");
                }
                //store it in temp spot
                this.addInstruction("8D"); // STA
                this.addInstruction(mathTemp);
                this.addInstruction("XX");
                //load left side into accumulator
                if (/^[0-9]$/.test(leftNode.name)) {
                    //load the number directly
                    this.addInstruction("A9"); // LDA
                    this.addInstruction("0" + leftNode.name);
                }
                else {
                    //it's a variable so look up the address
                    let sym = this.symbolTable.lookupSymbol(leftNode.name);
                    let leftAddr = sym.tempAddress;
                    this.addInstruction("AD"); //LDA
                    this.addInstruction(leftAddr);
                    this.addInstruction("XX");
                }
                //add right side to accumulator
                this.addInstruction("6D"); // ADC
                this.addInstruction(mathTemp);
                this.addInstruction("XX");
                //store final answer into target
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
                this.addInstruction("8D"); //STA
                this.addInstruction(tempAddress);
                this.addInstruction("XX");
                this.log(`Generated code for Assign: ${targetId} = ${exprNode.name}`);
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
                let tempAddress = sym.tempAddress;
                let varType = sym.type;
                this.addInstruction("AC"); // LDY
                this.addInstruction(tempAddress);
                this.addInstruction("XX");
                this.addInstruction("A2"); // LDX
                //if int or boolean, x = 01, if string x = 02
                if (varType === "int" || varType === "boolean") {
                    this.addInstruction("01");
                }
                else if (varType === "string") {
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
            if (conditionNode.name === "==") {
                let leftVar = conditionNode.children[0].name; // ex: b
                let rightVal = conditionNode.children[1].name; // ex: true or false
                let sym = this.symbolTable.lookupSymbol(leftVar);
                let condAddress = sym.tempAddress;
                //load x reg with right side, true is 1, false is 0
                let hexValue = rightVal === "true" ? "01" : "00";
                this.addInstruction("A2"); // LDX
                this.addInstruction(hexValue);
                //compare x to left variable
                this.addInstruction("EC"); // CPX
                this.addInstruction(condAddress);
                this.addInstruction("XX");
                //branch on not equal
                this.addInstruction("D0"); //BNE
                //add a placeholder for jump distance
                let jumpId = "J" + this.jumpCount;
                this.jumpCount++;
                this.addInstruction(jumpId);
                //save index of where jumpId is
                let jumpIndex = this.codePointer - 1;
                //generate code
                this.generateNode(blockNode);
                //find jump distance
                let distance = this.codePointer - (jumpIndex + 1);
                let hexDistance = distance.toString(16).toUpperCase().padStart(2, "0");
                //backpatch jump distance
                this.executable[jumpIndex] = hexDistance;
                this.log(`Generated code for If Statement: Jump distance is ${hexDistance} bytes`);
            }
        }
        //while loops
        else if (name === "While") {
            let conditionNode = node.children[0];
            let blockNode = node.children[1];
            if (conditionNode.name === "==" || conditionNode.name === "!=") {
                let leftVar = conditionNode.children[0].name;
                let rightVal = conditionNode.children[1].name;
                let sym = this.symbolTable.lookupSymbol(leftVar);
                let condAddress = sym.tempAddress;
                //mark start of loop
                let loopStartIndex = this.codePointer;
                //evaluate condition
                this.addInstruction("A2"); // LDX
                if (/^[0-9]$/.test(rightVal)) {
                    this.addInstruction("0" + rightVal); // Load digit
                }
                else {
                    let hexValue = rightVal === "true" ? "01" : "00";
                    this.addInstruction(hexValue); // Load boolean
                }
                this.addInstruction("EC"); // CPX
                this.addInstruction(condAddress);
                this.addInstruction("XX");
                let exitJumpIndex = 0;
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
        }
        else {
            for (let child of node.children) {
                this.generateNode(child);
            }
        }
    }
    // add hex command to memory
    addInstruction(hex) {
        if (this.errorFound)
            return;
        if (this.codePointer >= this.heapPointer) {
            this.log("CODEGEN ERROR: Stack Overflow! No more memory available to generate code.");
            return;
        }
        this.executable[this.codePointer] = hex;
        this.codePointer++;
    }
    //format the memory array into a string for output
    getExecutableString() {
        let output = "";
        for (let i = 0; i < this.executable.length; i++) {
            output += this.executable[i] + " ";
        }
        return output.trim();
    }
}
//# sourceMappingURL=codegen.js.map