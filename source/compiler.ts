function startCompile() {
    const sourceInput = (document.getElementById("sourceCode") as HTMLInputElement).value;
    const outputLog = document.getElementById("outputLog") as HTMLInputElement;

    outputLog.value = "Starting compilation...\n";
    outputLog.value += "Lexing program...\n";
    outputLog.value += "Input received: " + sourceInput;
}