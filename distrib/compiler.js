// source/compiler.ts
import { Lexer } from "./lexer.js";
import { Token, TokenType } from "./token.js";
import { Parser } from "./parser.js";
import { SemanticAnalyzer } from "./semantic.js";
import { CodeGenerator } from "./codegen.js";
// attach the function to global scope so it can be called from the HTML
window.startCompile = function () {
    // get html elements
    const sourceInput = document.getElementById("source-input").value;
    const outputLog = document.getElementById("console-output");
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
            // start parsing the current program
            outputLog.value += `\nINFO Parser - Parsing program ${programCount}...\n`;
            let myParser = new Parser(currentProgramTokens);
            myParser.parse();
            // print the parser log
            for (let logMsg of myParser.parseLog) {
                outputLog.value += `${logMsg}\n`;
            }
            // print the CST if there were no errors
            if (myParser.errorCount === 0) {
                outputLog.value += `\nParse completed for program ${programCount} with 0 errors.\n`;
                outputLog.value += `\n--- Concrete Syntax Tree (Program ${programCount}) ---\n`;
                outputLog.value += myParser.cst.toString();
                outputLog.value += `\n-----------------------------------------------\n`;
                // run semantic analysis on the CST
                outputLog.value += `\nINFO Semantic Analyzer - Analyzing program ${programCount}...\n`;
                let mySemantic = new SemanticAnalyzer(myParser.cst);
                mySemantic.analyze();
                //print the semantic log
                for (let logMsg of mySemantic.semanticLog) {
                    outputLog.value += `${logMsg}\n`;
                }
                //print the AST if there are no errors
                if (mySemantic.errorCount === 0) {
                    outputLog.value += `\nSemantic analysis completed for program ${programCount} with 0 errors and ${mySemantic.warningCount} warning(s).\n`;
                    outputLog.value += `\n--- Abstract Syntax Tree (Program ${programCount}) ---\n`;
                    outputLog.value += mySemantic.ast.toString();
                    outputLog.value += `\n-----------------------------------------------\n`;
                    // start code generation phase
                    outputLog.value += `\nINFO CodeGen - Generating machine code for program ${programCount}...\n`;
                    let myCodeGenerator = new CodeGenerator(mySemantic.ast, mySemantic.symbolTable);
                    myCodeGenerator.generate();
                    for (let logMsg of myCodeGenerator.codeLog) {
                        outputLog.value += `${logMsg}\n`;
                    }
                    outputLog.value += `\n--- Executable Machine Code (Program ${programCount}) ---\n`;
                    outputLog.value += myCodeGenerator.getExecutableString() + "\n";
                    outputLog.value += `------------------------------------------------\n`;
                }
                else {
                    outputLog.value += `\nSemantic analysis failed for program ${programCount} with ${mySemantic.errorCount} error(s). AST not generated.\n`;
                }
            }
            else {
                outputLog.value += `\nParse failed for program ${programCount} with ${myParser.errorCount} error(s). CST not generated.\n`;
            }
            // reset for next program
            currentProgramTokens = [];
            programCount++;
        }
    }
    // warning block
    if (currentProgramTokens.length > 0) {
        outputLog.value += `\nWARNING Lexer - Found ${currentProgramTokens.length} token(s) at the end of file missing an EOP ($) token. Auto-correcting and generating tokens... \n`;
        outputLog.value += `\nINFO Lexer - Lexing program ${programCount}...\n`;
        // add an EOP token to the end of the file if it was missing
        let lastT = currentProgramTokens[currentProgramTokens.length - 1];
        let fakeEOP = new Token(TokenType.T_EOP, "$", lastT.line, lastT.col + 1);
        currentProgramTokens.push(fakeEOP);
        // print the remaining tokens
        for (let t of currentProgramTokens) {
            outputLog.value += `DEBUG Lexer - ${TokenType[t.type]} [${t.value}] found at (${t.line}, ${t.col})\n`;
        }
        outputLog.value += `Lexing completed for program ${programCount} with 0 errors.\n`;
        // run tokens through the parser
        outputLog.value += `\nINFO Parser - Parsing program ${programCount}...\n`;
        let myParser = new Parser(currentProgramTokens);
        myParser.parse();
        for (let logMsg of myParser.parseLog) {
            outputLog.value += `${logMsg}\n`;
        }
        if (myParser.errorCount === 0) {
            outputLog.value += `\nParse completed for program ${programCount} with 0 errors.\n`;
            outputLog.value += `\n--- Concrete Syntax Tree (Program ${programCount}) ---\n`;
            outputLog.value += myParser.cst.toString();
            outputLog.value += `\n-----------------------------------------------\n`;
            // run semantic analysis on the CST
            outputLog.value += `\nINFO Semantic Analyzer - Analyzing program ${programCount}...\n`;
            let mySemantic = new SemanticAnalyzer(myParser.cst);
            mySemantic.analyze();
            //print the semantic log
            for (let logMsg of mySemantic.semanticLog) {
                outputLog.value += `${logMsg}\n`;
            }
            //print the AST if there are no errors
            if (mySemantic.errorCount === 0) {
                outputLog.value += `\nSemantic analysis completed for program ${programCount} with 0 errors and ${mySemantic.warningCount} warning(s).\n`;
                outputLog.value += `\n--- Abstract Syntax Tree (Program ${programCount}) ---\n`;
                outputLog.value += mySemantic.ast.toString();
                outputLog.value += `\n-----------------------------------------------\n`;
                // start code generation phase
                outputLog.value += `\nINFO CodeGen - Generating machine code for program ${programCount}...\n`;
                let myCodeGenerator = new CodeGenerator(mySemantic.ast, mySemantic.symbolTable);
                myCodeGenerator.generate();
                for (let logMsg of myCodeGenerator.codeLog) {
                    outputLog.value += `${logMsg}\n`;
                }
                outputLog.value += `\n--- Executable Machine Code (Program ${programCount}) ---\n`;
                outputLog.value += myCodeGenerator.getExecutableString() + "\n";
                outputLog.value += `------------------------------------------------\n`;
            }
            else {
                outputLog.value += `\nSemantic analysis failed for program ${programCount} with ${mySemantic.errorCount} error(s). AST not generated.\n`;
            }
        }
        else {
            outputLog.value += `\nParse failed for program ${programCount} with ${myParser.errorCount} error(s). CST not generated.\n`;
        }
    }
    // } else {
    //     for (let token of tokenStream) {
    //         outputLog.value += `DEBUG Lexer - ${TokenType[token.type]} [${token.value}] found at (${token.line}, ${token.col})\n`;
    //     }
    //     outputLog.value += `Lexing completed successfully with 0 errors.\n`;
    // }
};
// function startCompile() {
//     const sourceInput = (document.getElementById("sourceCode") as HTMLInputElement).value;
//     const outputLog = document.getElementById("outputLog") as HTMLInputElement;
//     outputLog.value = "Starting compilation...\n";
//     outputLog.value += "Lexing program...\n";
//     outputLog.value += "Input received: " + sourceInput;
// }
//# sourceMappingURL=compiler.js.map