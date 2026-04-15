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
    
    //outputLog.value += "Lexing program...\n";

    // create a new lexer and lex the input
    let myLexer = new Lexer(sourceInput);
    let tokenStream = myLexer.lex();

    // print lexer warnings to the output log
    if (myLexer.warnings.length > 0) {
        for (let warning of myLexer.warnings) {
            outputLog.value += `WARNING Lexer - ${warning}\n`;
        }
    }


    // print the tokens to the output log
    if (myLexer.errors.length > 0) {
        for (let error of myLexer.errors) {
            outputLog.value += `${error}\n`;
        }
        outputLog.value += `Lex failed with ${myLexer.errors.length} error(s).\n`;
        
        // stop compilation if there are lexing errors
        return;
    }

    let programCount = 1;
    let currentProgramTokens = []; // to store tokens for the current program

    for (let token of tokenStream) {
        currentProgramTokens.push(token);

        // Check for end of program token
        if (token.type === TokenType.T_EOP) {
            outputLog.value += `\nINFO Lexer - Lexing program ${programCount}...\n`;

            for (let t of currentProgramTokens) {
                outputLog.value += `DEBUG Lexer - ${TokenType[t.type]} [${t.value}] found at (${t.line}, ${t.col})\n`;
            }
            outputLog.value += `Lexing completed for program ${programCount} with 0 errors.\n`;

            // reset for next program
            currentProgramTokens = [];
            programCount++;
        }  
    }




    // } else {
    //     for (let token of tokenStream) {
    //         outputLog.value += `DEBUG Lexer - ${TokenType[token.type]} [${token.value}] found at (${token.line}, ${token.col})\n`;
    //     }
    //     outputLog.value += `Lexing completed successfully with 0 errors.\n`;
    // }
}



// function startCompile() {
//     const sourceInput = (document.getElementById("sourceCode") as HTMLInputElement).value;
//     const outputLog = document.getElementById("outputLog") as HTMLInputElement;

//     outputLog.value = "Starting compilation...\n";
//     outputLog.value += "Lexing program...\n";
//     outputLog.value += "Input received: " + sourceInput;
// }