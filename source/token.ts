// source/token.ts

// This contains a list of all the tokens that the lexer can produce
// Based on the grammar provided.

export enum TokenType {
    // Keywords
    T_LBRACE, // {
    T_RBRACE, // }
    T_LPAREN, // (
    T_RPAREN, // )
    T_ASSIGN, // =
    T_BOOLOP, // !=, ==
    T_INTOP, // +
    T_BOOLVAL, // true, false
    T_PRINT, // print
    T_IF, // if
    T_WHILE, // while
    T_TYPE, // int, string, boolean
    T_ID, // a-z
    T_DIGIT, // 0-9
    T_STRING, // ".*"
    T_EOP // $
}

// This class stores the type, the text, and where it was found in the source code
export class Token {
    type: TokenType;
    value: string;
    line: number
    col: number;

    constructor(type: TokenType, value: string, line: number, col: number) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
    }
}