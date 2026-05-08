// source/semantic.ts

import { Tree, TreeNode } from "./tree.js";

export class SemanticAnalyzer {
    cst: Tree;
    ast: Tree;
    semanticLog: string[] = [];
    errorCount: number = 0;
    warningCount: number = 0;

    constructor(cst: Tree) {
        this.cst = cst;
        this.ast = new Tree();
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
                let operator = cstNode.children[2].children[0].name;
                this.ast.addNode(operator, "branch");
                this.buildAST(cstNode.children[1]); //left expr
                this.buildAST(cstNode.children[3]); //right expr
                this.ast.endChildren();
            } else {
                this.buildAST(cstNode.children[0]); //true/false
            }
        }
        //other nodes we don't care about for the AST but the children are still processed
        else if (name === "Program" || name === "StatementList" || name === "Statement" || name === "Expr" || name === "StringExpr" || name === "CharList") {
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
}