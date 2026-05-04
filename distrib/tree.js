//source/tree.ts
export class TreeNode {
    constructor(name, isLeaf = false) {
        this.name = name;
        this.children = [];
        this.parent = null;
        this.isLeaf = isLeaf;
    }
}
export class Tree {
    constructor() {
        this.root = null;
        this.current = null;
    }
    // add a node to the tree
    addNode(name, kind) {
        // kind is either "branch" or "leaf"
        let node = new TreeNode(name, kind === "leaf");
        if (this.root === null) {
            // this is the root node
            this.root = node;
            this.current = node;
        }
        else {
            // add as child of current node
            node.parent = this.current;
            this.current.children.push(node);
            // if its a branch, traverse into it to add child nodes
            // if its a leaf, dont traverse into it since it cant have children
            if (kind === "branch") {
                this.current = node;
            }
        }
    }
    // move up the tree when we finish a grammar rule
    endChildren() {
        var _a;
        // move the current pointer back to the parent
        if (((_a = this.current) === null || _a === void 0 ? void 0 : _a.parent) !== null) {
            this.current = this.current.parent;
        }
    }
    // helper function to print the tree
    toString() {
        let traversalresult = "";
        // function to traverse the tree
        function expand(node, depth) {
            // add indentation based on depth
            for (let i = 0; i < depth; i++) {
                traversalresult += "-";
            }
            // if its a leaf put value in brackets
            if (node.isLeaf) {
                traversalresult += `[${node.name}]\n`;
            }
            else {
                // if its a branch print in angle brackets
                traversalresult += `<${node.name}>\n`;
            }
            // call recursively for all children
            for (let i = 0; i < node.children.length; i++) {
                expand(node.children[i], depth + 1);
            }
        }
        // start traversal from the root
        if (this.root !== null) {
            expand(this.root, 0);
        }
        // return the final string result
        return traversalresult;
    }
}
//# sourceMappingURL=tree.js.map