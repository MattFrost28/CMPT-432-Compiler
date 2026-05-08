//source/parser.ts
import { TokenType } from "./token.js";
import { Tree } from "./tree.js";
export class Parser {
    constructor(tokens) {
        this.tokenIndex = 0;
        this.errorCount = 0;
        // store output strings to print
        this.parseLog = [];
        this.tokens = tokens;
        this.currentToken = this.tokens[this.tokenIndex];
        this.cst = new Tree();
    }
    // helper function to log the output
    log(message) {
        this.parseLog.push(`DEBUG Parser - ${message}`);
    }
    // compares expected type to the actual token type
    match(expectedType) {
        if (this.currentToken.type === expectedType) {
            this.log(`Matched [${this.currentToken.value}] to ${TokenType[expectedType]}`);
            // add the token to tree as a leaf node
            this.cst.addNode(this.currentToken.value, "leaf");
            //move to next token
            this.tokenIndex++;
            if (this.tokenIndex < this.tokens.length) {
                this.currentToken = this.tokens[this.tokenIndex];
            }
        }
        else {
            // error, did not get expected token
            let expectedName = TokenType[expectedType];
            let actualName = TokenType[this.currentToken.type];
            this.parseLog.push(`\nPARSER ERROR: Expected ${expectedName}, but found ${actualName} [${this.currentToken.value}] at (${this.currentToken.line}, ${this.currentToken.col})`);
            this.errorCount++;
        }
    }
    // main parse function
    parse() {
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
    parseProgram() {
        this.log("parseProgram()");
        // A Program is a Block followed by an EOP token
        this.parseBlock();
    }
    parseBlock() {
        this.log("parseBlock()");
        this.cst.addNode("Block", "branch");
        // A Block is: { StatementList }
        this.match(TokenType.T_LBRACE);
        this.parseStatementList();
        this.match(TokenType.T_RBRACE);
        //block is finished
        this.cst.endChildren();
    }
    parseStatementList() {
        this.log("parseStatementList()");
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
        }
        else {
            // empty, probably hit a closing brace or something else that isnt a statement, so function naturally ends
        }
        this.cst.endChildren();
    }
    parseStatement() {
        this.log("parseStatement()");
        this.cst.addNode("Statement", "branch");
        let tType = this.currentToken.type;
        if (tType === TokenType.T_PRINT) {
            this.parsePrintStatement();
        }
        else if (tType === TokenType.T_TYPE) {
            this.parseVarDecl();
        }
        else if (tType === TokenType.T_WHILE) {
            this.parseWhileStatement();
        }
        else if (tType === TokenType.T_IF) {
            this.parseIfStatement();
        }
        else if (tType === TokenType.T_ID) {
            this.parseAssignStatement();
        }
        else if (tType === TokenType.T_LBRACE) {
            this.parseBlock();
        }
        else {
            // should not get here since valid statements are already checked for
            this.parseLog.push(`PARSER ERROR: Expected Stament start, found ${TokenType[tType]}`);
            this.errorCount++;
        }
        this.cst.endChildren();
    }
    // specific statement parsing functions
    // parse the print statement: print(Expr)
    parsePrintStatement() {
        this.log("parsePrintStatement()");
        this.cst.addNode("PrintStatement", "branch");
        // rule: printstatement = print(Expr)
        this.match(TokenType.T_PRINT);
        this.match(TokenType.T_LPAREN);
        // go into expression rule
        this.parseExpr();
        this.match(TokenType.T_RPAREN);
        this.cst.endChildren();
    }
    //parse variable declaration: type Id
    parseVarDecl() {
        this.log("parseVarDecl()");
        this.cst.addNode("VarDecl", "branch");
        // rule: varDecl = type Id
        this.match(TokenType.T_TYPE);
        this.match(TokenType.T_ID);
        this.cst.endChildren();
    }
    // expression rules
    parseExpr() {
        this.log("parseExpr()");
        this.cst.addNode("Expr", "branch");
        let tType = this.currentToken.type;
        if (tType === TokenType.T_DIGIT) {
            this.parseIntExpr();
        }
        else if (tType === TokenType.T_QUOTE) {
            this.parseStringExpr();
        }
        else if (tType === TokenType.T_LPAREN || tType === TokenType.T_BOOLVAL) {
            this.parseBooleanExpr();
        }
        else if (tType === TokenType.T_ID) {
            // expr can also just be an identifier by itself
            this.match(TokenType.T_ID);
        }
        else {
            this.parseLog.push(`PARSER ERROR: Expected Expression, found ${TokenType[tType]} [${this.currentToken.value}] at (${this.currentToken.line}:${this.currentToken.col})`);
            this.errorCount++;
        }
        this.cst.endChildren();
    }
    parseIntExpr() {
        this.log("parseIntExpr()");
        this.cst.addNode("IntExpr", "branch");
        // IntExpr -> digit intop Expr | digit
        this.match(TokenType.T_DIGIT);
        // check if we have an intop to continue the expression
        if (this.currentToken.type === TokenType.T_INTOP) {
            this.match(TokenType.T_INTOP);
            this.parseExpr();
        }
        this.cst.endChildren();
    }
    parseStringExpr() {
        this.log("parseStringExpr()");
        this.cst.addNode("StringExpr", "branch");
        // StringExpr -> " CharList "
        this.match(TokenType.T_QUOTE);
        this.parseCharList();
        this.match(TokenType.T_QUOTE);
        this.cst.endChildren();
    }
    parseCharList() {
        this.log("parseCharList()");
        this.cst.addNode("CharList", "branch");
        // CharList -> char CharList | space CharList | epsilon
        if (this.currentToken.type === TokenType.T_CHAR) {
            this.match(TokenType.T_CHAR);
            this.parseCharList();
        }
        else if (this.currentToken.type === TokenType.T_SPACE) {
            this.match(TokenType.T_SPACE);
            this.parseCharList();
        }
        else {
            // epsilon, hit closing quote
        }
        this.cst.endChildren();
    }
    //parse assignment statement: Id = Expr
    parseAssignStatement() {
        this.log("parseAssignStatement()");
        this.cst.addNode("AssignStatement", "branch");
        // rule: assignStatement = Id = Expr
        this.match(TokenType.T_ID);
        this.match(TokenType.T_ASSIGN);
        this.parseExpr();
        this.cst.endChildren();
    }
    // parse while statement: while BooleanExpr Block
    parseWhileStatement() {
        this.log("parseWhileStatement()");
        this.cst.addNode("WhileStatement", "branch");
        // rule: whileStatement = while BooleanExpr Block
        this.match(TokenType.T_WHILE);
        this.parseBooleanExpr();
        this.parseBlock();
        this.cst.endChildren();
    }
    // parse if statement: if BooleanExpr Block
    parseIfStatement() {
        this.log("parseIfStatement()");
        this.cst.addNode("IfStatement", "branch");
        // rule: ifStatement = if BooleanExpr Block
        this.match(TokenType.T_IF);
        this.parseBooleanExpr();
        this.parseBlock();
        this.cst.endChildren();
    }
    parseBooleanExpr() {
        this.log("parseBooleanExpr()");
        this.cst.addNode("BooleanExpr", "branch");
        let tType = this.currentToken.type;
        //BooleanExpr -> boolval | (Expr boolop Expr)
        if (tType === TokenType.T_LPAREN) {
            this.match(TokenType.T_LPAREN);
            this.parseExpr();
            this.match(TokenType.T_BOOLOP);
            this.parseExpr();
            this.match(TokenType.T_RPAREN);
        }
        else if (tType === TokenType.T_BOOLVAL) {
            this.match(TokenType.T_BOOLVAL);
        }
        else {
            this.parseLog.push(`PARSER ERROR: Expected Boolean Expression, found ${TokenType[tType]}`);
            this.errorCount++;
        }
        this.cst.endChildren();
    }
}
//# sourceMappingURL=parser.js.map