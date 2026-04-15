// source/token.ts
// This contains a list of all the tokens that the lexer can produce
// Based on the grammar provided.
export var TokenType;
(function (TokenType) {
    // Keywords
    TokenType[TokenType["T_LBRACE"] = 0] = "T_LBRACE";
    TokenType[TokenType["T_RBRACE"] = 1] = "T_RBRACE";
    TokenType[TokenType["T_LPAREN"] = 2] = "T_LPAREN";
    TokenType[TokenType["T_RPAREN"] = 3] = "T_RPAREN";
    TokenType[TokenType["T_ASSIGN"] = 4] = "T_ASSIGN";
    TokenType[TokenType["T_BOOLOP"] = 5] = "T_BOOLOP";
    TokenType[TokenType["T_INTOP"] = 6] = "T_INTOP";
    TokenType[TokenType["T_BOOLVAL"] = 7] = "T_BOOLVAL";
    TokenType[TokenType["T_PRINT"] = 8] = "T_PRINT";
    TokenType[TokenType["T_IF"] = 9] = "T_IF";
    TokenType[TokenType["T_WHILE"] = 10] = "T_WHILE";
    TokenType[TokenType["T_TYPE"] = 11] = "T_TYPE";
    TokenType[TokenType["T_ID"] = 12] = "T_ID";
    TokenType[TokenType["T_CHAR"] = 13] = "T_CHAR";
    TokenType[TokenType["T_SPACE"] = 14] = "T_SPACE";
    TokenType[TokenType["T_QUOTE"] = 15] = "T_QUOTE";
    TokenType[TokenType["T_DIGIT"] = 16] = "T_DIGIT";
    TokenType[TokenType["T_STRING"] = 17] = "T_STRING";
    TokenType[TokenType["T_EOP"] = 18] = "T_EOP"; // $
})(TokenType || (TokenType = {}));
// This class stores the type, the text, and where it was found in the source code
export class Token {
    constructor(type, value, line, col) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
    }
}
//# sourceMappingURL=token.js.map