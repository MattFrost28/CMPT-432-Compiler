// source/symbolTable.ts

export class SymbolTable {
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