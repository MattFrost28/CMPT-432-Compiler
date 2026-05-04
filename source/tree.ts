//source/tree.ts

export class TreeNode {
    public name: string;
    public children: TreeNode[];
    public parent: TreeNode | null;
    public isLeaf: boolean;

    constructor(name: string, isLeaf: boolean = false) {
        this.name = name;
        this.children = [];
        this.parent = null;
        this.isLeaf = isLeaf;
    }
}

export class Tree {
    public root: TreeNode | null = null;
    public current: TreeNode | null = null;

    // add a node to the tree
    public addNode(name: string, kind: string): void {
        // kind is either "branch" or "leaf"
        let node = new TreeNode(name, kind === "leaf");

        if (this.root === null) {
            // this is the root node
            this.root = node;
            this.current = node;
        } else {
            // add as child of current node
            node.parent = this.current;
            this.current!.children.push(node);

            // if its a branch, traverse into it to add child nodes
            // if its a leaf, dont traverse into it since it cant have children
            if (kind === "branch") {
                this.current = node;
            }
        }
    }

    // move up the tree when we finish a grammar rule
    public endChildren(): void {
        // move the current pointer back to the parent
        if (this.current?.parent !== null) {
            this.current = this.current!.parent;
        }
    }

    // helper function to print the tree
    public toString(): string {
        let traversalresult = "";

        // function to traverse the tree
        function expand(node: TreeNode, depth: number): void {
            // add indentation based on depth
            for (let i = 0; i < depth; i++) {
                traversalresult += "-";
            }

            // if its a leaf put value in brackets
            if (node.isLeaf) {
                traversalresult += `${node.name}\n`;
            } else {
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