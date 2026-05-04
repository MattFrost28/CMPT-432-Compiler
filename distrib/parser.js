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
}
//# sourceMappingURL=parser.js.map