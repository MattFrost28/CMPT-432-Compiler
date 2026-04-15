// source/lexer.ts

import { Token, TokenType } from "./token";


// This class is responsible for taking in the source code and producing a list of tokens
export class Lexer {
    sourceCode: string;
    currentPos: number;
    line: number = 1;
    col: number = 1;
    tokens: Token[] = [];
    errors: string[] = [];

    constructor(sourceCode: string) {
        this.sourceCode = sourceCode;
        this.currentPos = 0;
    }

    // This function is the main function that will be called to produce the list of tokens
    public lex(): Token[] {
        while (this.currentPos < this.sourceCode.length) {
            let char = this.sourceCode[this.currentPos];

            // 1. Handle whitespace and new lines
            if (char === ' ' || char === '\t') {
                this.advance();
                continue;
            } else if (char === '\n') {
                this.line++;
                this.col = 1;
                this.currentPos++;
                continue;
            }

            // 2. Handle Comments /* ... */
            // Look ahead to see if it is the start of a comment
            if (char === '/' && this.peek() === '*') {
                this.consumeComment();
                
                // move to the next token after comment is ignored
                continue;
            }

            // 3. Handle single character tokens
            if (char === '{') {
                this.addToken(TokenType.T_LBRACE, char);
            }
            else if (char === '}') {
                this.addToken(TokenType.T_RBRACE, char);
            }
            else if (char === '(') {
                this.addToken(TokenType.T_LPAREN, char);
            }
            else if (char === ')') {
                this.addToken(TokenType.T_RPAREN, char);
            }
            else if (char === '+') {
                this.addToken(TokenType.T_INTOP, char);
            }
            else if (char === '$') {
                this.addToken(TokenType.T_EOP, char);
            }

            // 3a. Handle Eauals vs Equality
            else if (char === '=') {
                if (this.peek() === '=') {
                    // double equals '=='
                    this.addToken(TokenType.T_BOOLOP, '==');
                    this.advance(); // consume the second '='
                } else {
                    // single equals '='
                    this.addToken(TokenType.T_ASSIGN, char);
                }
            }

            // 3b. Handle Boolean Operator !=
            else if (char === '!') {
                if (this.peek() === '=') {
                    this.addToken(TokenType.T_BOOLOP, '!=');
                    this.advance(); // consume the '='
                } else {
                    // standalone '!' is not valid in our language, report an error
                    this.errors.push(`Unexpected character '!' at ${this.line}:${this.col}`);
                    this.advance();
                }
            }

            // 4. Handle String Literals
            else if (char === '"') {
                this.consumeString();
            }

            // 5. Handle Digits
            else if (/[0-9]/.test(char)) {
                this.addToken(TokenType.T_DIGIT, char);
            }

            // 6. Handle Identifiers and Keywords
            else if (/[a-z]/.test(char)) {
                this.consumeWord(char);
            }

            // 7. Error Handling for unrecognized characters
            else {
                this.errors.push(`Unexpected character '${char}' at ${this.line}:${this.col}`);
                this.advance();
            }
        }

        return this.tokens;
    }


    // Helper Functions

    // Helper to move forward in the source code and update line/col
    private advance(): void {
        this.currentPos++;
        this.col++;
    }

    // Helper to peek at the next character without consuming it
    private peek(): string {
        // if at the end of the source code, return null character
        if (this.currentPos + 1 >= this.sourceCode.length) {
            return '\0';
        }
        return this.sourceCode[this.currentPos + 1];
    }

    // Helper to add token to array and move forward
    private addToken(type: TokenType, value: string): void {
        // create new token object with current line and column
        let newToken = new Token(type, value, this.line, this.col);
        this.tokens.push(newToken);

        //consume the character after adding the token
        this.advance();
    }

    // Helper to consume comments
    private consumeComment(): void {
        this.advance(); // consume '/'
        this.advance(); // consume '*'

        while (this.currentPos < this.sourceCode.length) {
            let char = this.sourceCode[this.currentPos];

            // check for end of comment
            if (char === '*' && this.peek() === '/') {
                this.advance(); // consume '*'
                this.advance(); // consume '/'
                return; // exit the comment
            }

            // handle new lines within comments
            if (char === '\n') {
                this.line++;
                this.col = 0;
            }

            this.advance();
        }
        // if we reach the end of the source code without closing the comment, report an error
        this.errors.push(`Unterminated comment starting at ${this.line}:${this.col}`);
    }

    // Helper to consume string literals
    private consumeString(): void {
        this.addToken(TokenType.T_QUOTE, '"'); // add the opening quote as a token

        while (this.currentPos < this.sourceCode.length) {
            let char = this.sourceCode[this.currentPos];

            // check for end of string
            if (char === '"') {
                this.addToken(TokenType.T_QUOTE, '"'); // add the closing quote as a token
                return; // exit the string
            }

            // ensure only lowercase letters and spaces are allowed in strings
            if (/[a-z]/.test(char)) {
                this.addToken(TokenType.T_CHAR, char);
            } else if (char === ' ') {
                this.addToken(TokenType.T_SPACE, char);
            } else {
                this.errors.push(`Invalid character '${char}' in string literal at ${this.line}:${this.col}`);
                this.advance();
            }
        }
        // if we reach the end of the source code without closing the string, report an error
        this.errors.push(`Unterminated string literal starting at ${this.line}:${this.col}`);
    }

    // Helper to check for keywords and identifiers
    private consumeWord(char: string): void {
        // get the rest of the word from the current position on
        let remaining = this.sourceCode.substring(this.currentPos);

        // check for keywords first
        if (remaining.startsWith("print")) {
            this.addToken(TokenType.T_PRINT, "print");
            this.advanceN(4); // consume the rest of the keyword

            } else if (remaining.startsWith("while")) {
            this.addToken(TokenType.T_WHILE, "while");
            this.advanceN(4); // consume the rest of the keyword

            } else if (remaining.startsWith("if")) {
            this.addToken(TokenType.T_IF, "if");
            this.advanceN(1); // consume the rest of the keyword

            } else if (remaining.startsWith("int")) {
            this.addToken(TokenType.T_TYPE, "int");
            this.advanceN(2); // consume the rest of the keyword

            } else if (remaining.startsWith("string")) {
            this.addToken(TokenType.T_TYPE, "string");
            this.advanceN(5); // consume the rest of the keyword

            } else if (remaining.startsWith("boolean")) {
            this.addToken(TokenType.T_TYPE, "boolean");
            this.advanceN(6); // consume the rest of the keyword

            } else if (remaining.startsWith("true")) {
            this.addToken(TokenType.T_BOOLVAL, "true");
            this.advanceN(3); // consume the rest of the keyword

            } else if (remaining.startsWith("false")) {
            this.addToken(TokenType.T_BOOLVAL, "false");
            this.advanceN(4); // consume the rest of the keyword
            
            } else {
            // if it's not a keyword, it must be an identifier
            this.addToken(TokenType.T_ID, char);
        }
    }

        // helper to advance multiple characters at once (used for consuming keywords)
    private advanceN(n: number): void {
        for (let i = 0; i < n; i++) {
            this.advance();
        }
    }
}

                