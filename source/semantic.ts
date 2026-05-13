// source/semantic.ts

import { Tree, TreeNode } from "./tree.js";
import { SymbolTable } from "./symbolTable.js";

export class SemanticAnalyzer {
    cst: Tree;
    ast: Tree;
    symbolTable: SymbolTable;
    semanticLog: string[] = [];
    errorCount: number = 0;
    warningCount: number = 0;

    constructor(cst: Tree) {
        this.cst = cst;
        this.ast = new Tree();
        this.symbolTable = new SymbolTable();
    }

    private log(message:string): void {
        this.semanticLog.push(`DEBUG Semantic - ${message}`);
    }

    // entry for semantic analysis
    public analyze(): void {
        this.log("Starting Semantic Analysis...");

        //build the AST from the CST
        this.log("Building Abstract Syntax Tree (AST)...");
        if (this.cst.root) {
            this.buildAST(this.cst.root);
        }

        //generate the symbol table and check scopes
        this.log("Starting Scope Checking...");
        if (this.ast.root) {
            this.scopeCheck(this.ast.root);
        }

        //check for warnings and hints
        for (let symbol of this.symbolTable.symbols) {
            if (!symbol.isUsed) {
                // Case: Variable was never used at all
                if (symbol.isInitialized) {
                    // It was assigned a value but never read
                    this.log(`SEMANTIC HINT: Variable [${symbol.name}] on line ${symbol.line} was initialized but never used.`);
                } else {
                    // It was declared but completely ignored
                    this.log(`SEMANTIC HINT: Variable [${symbol.name}] on line ${symbol.line} was declared but never used or initialized.`);
                }
                this.warningCount++;
            }
        }

        //print the symbol table t othe log
        this.semanticLog.push(this.symbolTable.toString());

        //type check the AST
        if (this.errorCount === 0 && this.ast.root) {
            this.log("Starting Type Checking...");
            this.typeCheck(this.ast.root);
        }


        this.log(`Semantic Analysis complete with ${this.errorCount} error(s) and ${this.warningCount} warning(s).`);

    }

    // ast generation
    private buildAST(cstNode: TreeNode): void {
        // look at the name of the node of the CST and decide how to process it
        let name = cstNode.name;

        //branch nodes we care about for the AST
        if (name === "Block") {
            this.ast.addNode("Block", "branch");
            // process the children of the block
            for (let child of cstNode.children) {
                this.buildAST(child);
            }
            this.ast.endChildren();
        }
        else if (name === "VarDecl") {
            this.ast.addNode("VarDecl", "branch");
            // var decl has two children, type and id
            this.ast.addNode(cstNode.children[0].name, "leaf"); //the type
            this.ast.addNode(cstNode.children[1].name, "leaf"); //the id
            this.ast.endChildren();
        }
        else if (name === "PrintStatement") {
            this.ast.addNode("Print", "branch");
            // the expression to print is in thte third child
            // (0 is print, 1 is the open paren, 2 is the expression, 3 is the close paren)
            this.buildAST(cstNode.children[2]);
            this.ast.endChildren();
        }
        else if (name === "AssignStatement") {
            this.ast.addNode("Assign", "branch");
            //(0 is the id, 1 is the equals sign, 2 is the expression)
            this.ast.addNode(cstNode.children[0].name, "leaf"); //id
            this.buildAST(cstNode.children[2]); //expression
            this.ast.endChildren();
        }
        else if (name === "WhileStatement") {
            this.ast.addNode("While", "branch");
            // While -> (0 is while, 1 is the open paren, 2 is the condition expression)
            this.buildAST(cstNode.children[1]); //booleanexpr
            this.buildAST(cstNode.children[2]); //block
            this.ast.endChildren();
        }
        else if (name === "IfStatement") {
            this.ast.addNode("If", "branch");
            // If -> if BooleanExpr Block
            this.buildAST(cstNode.children[1]); //booleanexpr
            this.buildAST(cstNode.children[2]); //block
            this.ast.endChildren();
        }
        else if (name === "IntExpr") {
            // IntExpr -> digit intop Expr | digit
            if (cstNode.children.length > 1) {
                this.ast.addNode("Plus", "branch");
                this.buildAST(cstNode.children[0]); // Digit
                this.buildAST(cstNode.children[2]); //rest of the Expr
                this.ast.endChildren();
            } else {
                this.buildAST(cstNode.children[0]); //the digit
            }
        }
        else if (name === "BooleanExpr") {
            // BooleanExpr -> ( Expr boolop Expr ) | boolean
            if (cstNode.children.length > 1) {
                // grab the operator
                let operator = cstNode.children[2].name;
                this.ast.addNode(operator, "branch");
                this.buildAST(cstNode.children[1]); //left expr
                this.buildAST(cstNode.children[3]); //right expr
                this.ast.endChildren();
            } else {
                this.buildAST(cstNode.children[0]); //true/false
            }
        }
        else if (name === "StringExpr") {
            let fullString = "";
            
            //function to dig through the CharLists and grab the characters
            const extractString = (node: TreeNode) => {
                if (node.isLeaf && node.name !== '"') {
                    fullString += node.name;
                }
                for (let child of node.children) {
                    extractString(child);
                }
            };
            
            extractString(cstNode);
            this.ast.addNode('"' + fullString + '"', "leaf");
        }
        //other nodes we don't care about for the AST but the children are still processed
        else if (name === "Program" || name === "StatementList" || name === "Statement" || name === "Expr") {
            // just process the children, don't add to the AST
            for (let child of cstNode.children) {
                this.buildAST(child);
            }
        }
        //leaf nodes that we do care about
        else if (cstNode.isLeaf) {
            //ignore things such as braces, parens, prints, etc
            let ignoreList = ["{", "}", "(", ")", '"', "=", "print", "while", "if", "int", "string", "boolean", "$"];
            if (!ignoreList.includes(name)) {
                this.ast.addNode(name, "leaf");
            }
        }
        else {
            // for any other nodes we don't recognize, just process the children
            for (let child of cstNode.children) {
                this.buildAST(child);
            }
        }
    }

    // scope and symbol table generation
    private scopeCheck(astNode: TreeNode): void {
        let name = astNode.name;

        if (name === "Block") {
            this.symbolTable.enterScope();
            for (let child of astNode.children) {
                this.scopeCheck(child);
            }
            this.symbolTable.exitScope();
        }
        else if (name === "VarDecl") {
            let varType = astNode.children[0].name;
            let varId = astNode.children[1].name;
            
            //check for redeclaration
            if (this.symbolTable.checkRedeclaration(varId)) {
                this.log(`SEMANTIC ERROR: Redeclared identifier [${varId}] in scope ${this.symbolTable.currentScope}`);
                this.errorCount++;
            } else {
                this.symbolTable.addSymbol(varId, varType, 0); // (Line 0 for now)
                this.log(`Added [${varId}] to Scope ${this.symbolTable.currentScope}`);
            }
        }
        else if (name === "Assign") {
            let targetId = astNode.children[0].name;
            
            //check for undeclared assignment
            let sym = this.symbolTable.lookupSymbol(targetId);
            if (sym === null) {
                this.log(`SEMANTIC ERROR: Undeclared identifier [${targetId}] in assignment`);
                this.errorCount++;
            } else {
                sym.isInitialized = true; 
            }
            
            //check the right side of the assignment
            this.scopeCheck(astNode.children[1]); 
        }
        else if (astNode.isLeaf) {
            // check for uninitialized variable usage and undeclared variable usage
            // if its a lowercase letter, its an id
            let isVariable = /^[a-z]$/.test(name); 
            
            if (isVariable) {
                let sym = this.symbolTable.lookupSymbol(name);
                if (sym === null) {
                    this.log(`SEMANTIC ERROR: Undeclared identifier [${name}] used in expression`);
                    this.errorCount++;
                } else {
                    sym.isUsed = true; // we are using it
                    
                    // Trigger a warning if they use it before giving it a value!
                    if (!sym.isInitialized) {
                        this.log(`SEMANTIC WARNING: Uninitialized identifier [${name}] used in expression`);
                        this.warningCount++;
                    }
                }
            }
        }
        else {
            // For While, If, Plus, ==, !=, just keep going down the tree
            for (let child of astNode.children) {
                this.scopeCheck(child);
            }
        }
    }

    //helper function to figure out the exact type of any node in thee ast
    private getType(node: TreeNode): string {
        if (node.isLeaf) {
            let val = node.name;
            if (/^[0-9]$/.test(val)) return "int";
            if (val === "true" || val === "false") return "boolean";
            if (val.startsWith('"')) return "string";
            if (/^[a-z]$/.test(val)) {
                let sym = this.symbolTable.lookupSymbol(val);
                if (sym) return sym.type;
            }
        } else {
            if (node.name === "Plus") return "int";
            if (node.name === "==" || node.name === "!=") return "boolean";
        }
        return "unknown";
    }

    private typeCheck(astNode: TreeNode): void {
        let name = astNode.name;

        if (name === "Block") {
            this.symbolTable.enterScope();
            for (let child of astNode.children) {
                this.typeCheck(child);
            }
            this.symbolTable.exitScope();
        }

        else if (name === "Assign") {
            let targetId = astNode.children[0].name;
            let sym = this.symbolTable.lookupSymbol(targetId);

            if (sym) {
                let leftType = sym.type;
                let rightType = this.getType(astNode.children[1]);

                if (leftType !== rightType) {
                    this.log(`TYPE ERROR: Type mismatch in assignment. Cannot assign [${rightType}] to [${leftType}] variable [${targetId}]`);
                    this.errorCount++;
                }
            }
            this.typeCheck(astNode.children[1]);
        }
        else if (name === "Plus") {
            let leftType = this.getType(astNode.children[0]);
            let rightType = this.getType(astNode.children[1]);

            if (leftType !== "int" || rightType !== "int") {
                this.log(`TYPE ERROR: Invalid operands for '+'. Expected [int] + [int], got [${leftType}] + [${rightType}]`);
                this.errorCount++;
            }
            this.typeCheck(astNode.children[0]);
            this.typeCheck(astNode.children[1]);
        }
        else if (name === "==" || name === "!=") {
            let leftType = this.getType(astNode.children[0]);
            let rightType = this.getType(astNode.children[1]);

            if (leftType !== rightType) {
                this.log(`TYPE ERROR: Type mismatch in comparison. Cannot compare [${leftType}] and [${rightType}].`);
                this.errorCount++;
            }
            this.typeCheck(astNode.children[0]);
            this.typeCheck(astNode.children[1]);
        }
        else if (name === "If" || name === "While") {
            let conditionType = this.getType(astNode.children[0]);
            if (conditionType !== "boolean") {
                this.log(`TYPE ERROR: Condition for [${name}] statement must be a boolean, got [${conditionType}]`);
                this.errorCount++;
            }
            for (let child of astNode.children) {
                this.typeCheck(child);
            }
        }
        else {
            //for blocks, prints, and other nodes just keep checking down the tree
            for (let child of astNode.children) {
                this.typeCheck(child);
            }
        }
    }
}