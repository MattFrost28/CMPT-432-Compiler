// source/symbolTable.ts
export class SymbolTable {
    constructor(name, type, scope, line) {
        this.isInitialized = false;
        this.isUsed = false;
        this.name = name;
        this.type = type;
        this.scope = scope;
        this.line = line;
    }
}
//# sourceMappingURL=symbolTable.js.map