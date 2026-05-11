// source/symbolTable.ts

export class SymbolNode {
    name: string;
    type: string;
    scope: number;
    line: number;
    isInitialized: boolean = false;
    isUsed: boolean = false;

    constructor(name: string, type: string, scope: number, line: number) {
        this.name = name;
        this.type = type;
        this.scope = scope;
        this.line = line;
    }
}
export class SymbolTable {
    symbols: SymbolNode[] = [];
    currentScope: number = -1;

    // add a new symbol to the table
    public addSymbol(name: string, type: string, line: number): void {
        let newSymbol = new SymbolNode(name, type, this.currentScope, line);
        this.symbols.push(newSymbol);
    }

    //checks if a variable has been declared in the current scope
    public checkRedeclaration(name: string): boolean {
        for (let sym of this.symbols) {
            if (sym.name === name && sym.scope === this.currentScope) {
                return true;
            }
        }
        return false;
    }

    //look up scope tree to find variable
    //returns the symbolnode if found, otherwise returns null
    public lookupSymbol(name: string): SymbolNode | null {
        //check current scope and then move up the scope tree
        for (let i = this.currentScope; i >= 0; i--) {
            for (let sym of this.symbols) {
                if (sym.name === name && sym.scope === i) {
                    return sym;
                }
            }
        }
        //not foudn in any scope
        return null;
    }

    // enter a new scope
    public enterScope(): void {
        this.currentScope++;
    }

    // exit current scope
    public exitScope(): void {
        this.currentScope--;
    }

    //print the symbol table
    public toString(): string {
        let output = "\n--- Symbol Table ---\n";
        output += "Name\tType\tScope\tLine\tInit?\tUsed?\n";
        output += "---------------------------------------------\n";
        for (let sym of this.symbols) {
            // make the booleans be yes or no
            let init = sym.isInitialized ? "Yes" : "No";
            let used = sym.isUsed ? "Yes" : "No";
            output += `${sym.name}\t${sym.type}\t${sym.scope}\t${sym.line}\t${init}\t${used}\n`;
        }
        return output;
    }
}