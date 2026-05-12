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

    //entry point for phase 4
    public generate(): void {
        this.log("Starting code generation...");

        //start recursive ast traversal
        if (this.ast.root) {
            this.generateNode(this.ast.root);
        }

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
            for (let child of node.children) {
                this.generateNode(child);
            }
        }
        else if (name === "VarDecl") {
            // vardecl has 2 children, type and id
            let varType = node.children[0].name;
            let varId = node.children[1].name;

            //make a temp addresss
            let tempAddress = "T" + this.tempCount;
            this.tempCount++;

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
            let tempAddress = this.staticTable.get(targetId)!;
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
                } else {
                    //it's a variable so look up the address
                    let rightAddr = this.staticTable.get(rightNode.name)!;
                    this.addInstruction("AD") //LDA
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
                } else {
                    //it's a variable so look up the address
                    let leftAddr = this.staticTable.get(leftNode.name)!;
                    this.addInstruction("AD") //LDA
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
        }
        else if (name === "Print") {
            let exprNode = node.children[0];

            //printing integer
            if (exprNode.isLeaf && /^[a-z]$/.test(exprNode.name)) {
                let tempAddress = this.staticTable.get(exprNode.name)!;

                //ask type table what type of variable
                let varType = this.typeTable.get(exprNode.name)!;

                this.addInstruction("AC"); // LDY
                this.addInstruction(tempAddress);
                this.addInstruction("XX");

                this.addInstruction("A2"); // LDX

                //if int, x = 01, if string x = 02
                if (varType === "int") {
                    this.addInstruction("01");
                } else if (varType === "string") {
                    this.addInstruction("02");
                }

                this.addInstruction("FF"); // SYS call

                this.log(`Generated code for Print: ${varType} variable [${exprNode.name}] printed`);
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
        if (this.codePointer >= this.heapPointer) {
            this.log("CODEGEN ERROR: Stack Overflow! No more memory available to generate code.");
            return;
        }
        this.executable[this.codePointer] = hex;
        this.codePointer++;
    }

    //format the memory array into a string for output
    public getExecutableString(): string {
        let output = "";
        for (let i = 0; i < this.executable.length; i++) {
            output += this.executable[i] + " ";
        }
        return output.trim();
    }
}