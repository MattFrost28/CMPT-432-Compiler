// source/compiler.ts
import { Lexer } from "./lexer.js";
import { TokenType } from "./token.js";

// attach the function to global scope so it can be called from the HTML
(window as any).startCompile = function() {
    // get html elements
    const sourceInput = (document.getElementById("sourceCode") as HTMLInputElement).value;
    const outputLog = document.getElementById("outputLog") as HTMLInputElement;

    // clear the output log
    outputLog.value = "Starting compilation...\n";
    outputLog.value += "Lexing program...\n";

    // create a new lexer and lex the input
    let myLexer = new Lexer(sourceInput);
    let tokenStream = myLexer.lex();

    // print the tokens to the output log
    if (myLexer.errors.length > 0) {
        for (let error of myLexer.errors) {
            outputLog.value += `${error}\n`;
        }
        outputLog.value += `Lex failed with ${myLexer.errors.length} error(s).\n`;
    } else {
        for (let token of tokenStream) {
            outputLog.value += `DEBUG Lexer - ${TokenType[token.type]} [${token.value}] found at (${token.line}, ${token.col})\n`;
        }
        outputLog.value += `Lexing completed successfully with 0 errors.\n`;
    }
}



// function startCompile() {
//     const sourceInput = (document.getElementById("sourceCode") as HTMLInputElement).value;
//     const outputLog = document.getElementById("outputLog") as HTMLInputElement;

//     outputLog.value = "Starting compilation...\n";
//     outputLog.value += "Lexing program...\n";
//     outputLog.value += "Input received: " + sourceInput;
// }