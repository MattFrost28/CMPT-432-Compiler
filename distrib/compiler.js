"use strict";
function startCompile() {
    const sourceInput = document.getElementById("sourceCode").value;
    const outputLog = document.getElementById("outputLog");
    outputLog.value = "Starting compilation...\n";
    outputLog.value += "Lexing program...\n";
    outputLog.value += "Input received: " + sourceInput;
}
//# sourceMappingURL=compiler.js.map