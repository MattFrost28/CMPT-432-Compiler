//source/parser.ts

import { Token, TokenType } from "./token.js";
import { Tree } from "./tree.js";

export class Parser {
    tokens: Token[];
    tokenIndex: number = 0;
    currentToken: Token;
    cst: Tree;
    errorCount: number = 0;

    // store output strings to print
    parseLog: string[] = [];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.currentToken = this.tokens[this.tokenIndex];
        this.cst = new Tree();
    }

    // helper function to log the output
    private log(message:string): void {
        this.parseLog.push(`DEBUG Parser - ${message}`);   
    }

    // compares expected type to the actual token type
    private match(expectedType: TokenType): void {
        if (this.currentToken.type === expectedType) {
            this.log(`Matched [${this.currentToken.value}] to ${TokenType[expectedType]}`);
            
            // add the token to tree as a leaf node
            this.cst.addNode(this.currentToken.value, "leaf");

            //move to next token
            this.tokenIndex++;
            if (this.tokenIndex < this.tokens.length) {
                this.currentToken = this.tokens[this.tokenIndex];
            }
        } else {
            // error, did not get expected token
            let expectedName = TokenType[expectedType];
            let actualName = TokenType[this.currentToken.type];
            this.parseLog.push(`\nPARSER ERROR: Expected ${expectedName}, but found ${actualName} [${this.currentToken.value}] at (${this.currentToken.line}, ${this.currentToken.col})`);
            this.errorCount++;
        }
    }

    // main parse function
    public parse(): void {
        this.log("Starting parse...");

        //grammar says that everything must start with a program
        this.cst.addNode("Program", "branch");
        this.parseProgram();

        // when done, make sure EOP is hit
        if (this.errorCount === 0) {
            this.match(TokenType.T_EOP);
            this.log(`Parsing completed with ${this.errorCount} error(s).`);
        }
    }

    // Grammar Rules are Here
    private parseProgram(): void {
        this.log("parseProgram()")

        // A Program is a Block followed by an EOP token
        this.parseBlock();
    }

    private parseBlock(): void {
        this.log("parseBlock()")
        this.cst.addNode("Block", "branch");

        // A Block is: { StatementList }
        this.match(TokenType.T_LBRACE);
        this.parseStatementList();
        this.match(TokenType.T_RBRACE);

        //block is finished
        this.cst.endChildren();
    }

    private parseStatementList(): void {
        this.log("parseStatementList()")
        this.cst.addNode("StatementList", "branch");

        // check to see if we have a statement or if the list is empty
        let tType = this.currentToken.type;

        // A Statement can start with a print, a type, while, if, an ID, or a block
        if (tType === TokenType.T_PRINT ||
            tType === TokenType.T_TYPE ||
            tType === TokenType.T_WHILE ||
            tType === TokenType.T_IF ||
            tType === TokenType.T_ID ||
            tType === TokenType.T_LBRACE) {
                
                // parse the statement
                this.parseStatement();

                // call parse statement list to see if there are more statements
                this.parseStatementList();
        } else {
            // empty, probably hit a closing brace or something else that isnt a statement, so function naturally ends
        }

        this.cst.endChildren();
    }
}