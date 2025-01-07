let t = 2; // Default degree for the B-tree
let ctx; // Global canvas context
let canvas; // Global canvas element
let btree; // Global BTree instance

class BTreeNode {
    constructor(isLeaf, t) {
        this.keys = [];
        this.children = [];
        this.isLeaf = isLeaf;
        this.t = t;
    }

    insertNonFull(key, path = [], x = canvas.width / 2, y = 50, gapX = canvas.width / 3, gapY = 100) {
        path.push({ node: this, x, y }); // Add the current node and its actual position to the path
    
        let i = this.keys.length - 1;
    
        if (this.isLeaf) {
            // Find the correct position to insert the key
            while (i >= 0 && key < this.keys[i]) {
                i--;
            }
            this.keys.splice(i + 1, 0, key); // Insert the key in sorted order
        } else {
            // Find the correct child to insert into
            while (i >= 0 && key < this.keys[i]) {
                i--;
            }
            i++;
    
            // Compute the child's position
            const childX = x - gapX / 2 + (gapX / (this.children.length - 1 || 1)) * i;
            const childY = y + gapY;
    
            const child = this.children[i];
    
            if (child.keys.length === 2 * this.t - 1) {
                this.splitChild(i);
                if (key > this.keys[i]) {
                    i++;
                }
            }
    
            // Recurse into the appropriate child and continue collecting the path
            this.children[i].insertNonFull(key, path, childX, childY, gapX / 2, gapY);
        }
    }          
    

    splitChild(i) {
        const child = this.children[i];
        const midIndex = this.t - 1;
        const newChild = new BTreeNode(child.isLeaf, this.t);

        newChild.keys = child.keys.splice(midIndex + 1);
        if (!child.isLeaf) {
            newChild.children = child.children.splice(midIndex + 1);
        }

        this.keys.splice(i, 0, child.keys.pop());
        this.children.splice(i + 1, 0, newChild);
    }

    deleteKey(key) {
        let idx = this.keys.findIndex((k) => k >= key);
    
        // If key is greater than all keys, adjust idx to point to the last child
        if (idx === -1) {
            idx = this.keys.length; // Point to the rightmost child
        }
    
        if (idx < this.keys.length && this.keys[idx] === key) {
            if (this.isLeaf) {
                this.keys.splice(idx, 1); // Directly delete key from leaf
            } else {
                this.deleteFromInternalNode(idx); // Delete key from internal node
            }
        } else {
            if (this.isLeaf) return false;
    
            let child = this.children[idx]; // Access the appropriate child
            if (child.keys.length < this.t) {
                this.fillChild(idx); // Ensure child has sufficient keys
    
                // Adjust idx after fillChild in case of merge
                if (idx > this.keys.length) {
                    idx--; // Adjust idx for a left merge
                }
                child = this.children[idx]; // Update child reference
            }
    
            const deleted = child.deleteKey(key); // Recursive call
    
            // If the child becomes empty, remove it
            if (child.keys.length === 0) {
                this.children.splice(idx, 1);
            }
    
            return deleted;
        }
    
        return true;
    }    
    

    deleteFromInternalNode(idx) {
        const key = this.keys[idx];
        const leftChild = this.children[idx];
        const rightChild = this.children[idx + 1];

        if (leftChild.keys.length >= this.t) {
            const predecessor = this.getPredecessor(idx);
            this.keys[idx] = predecessor;
            leftChild.deleteKey(predecessor);
        } else if (rightChild.keys.length >= this.t) {
            const successor = this.getSuccessor(idx);
            this.keys[idx] = successor;
            rightChild.deleteKey(successor);
        } else {
            this.merge(idx);
            leftChild.deleteKey(key);
        }
    }

    fillChild(idx) {
        const child = this.children[idx];
        const leftSibling = idx > 0 ? this.children[idx - 1] : null;
        const rightSibling = idx < this.children.length - 1 ? this.children[idx + 1] : null;
    
        if (leftSibling && leftSibling.keys.length > this.t) {
            // Borrow a key from the left sibling
            child.keys.unshift(this.keys[idx - 1]); // Move parent's key to child
            this.keys[idx - 1] = leftSibling.keys.pop(); // Move sibling's last key to parent
            if (!child.isLeaf) {
                child.children.unshift(leftSibling.children.pop()); // Move sibling's last child pointer
            }
        } else if (rightSibling && rightSibling.keys.length > this.t) {
            // Borrow a key from the right sibling
            child.keys.push(this.keys[idx]); // Move parent's key to child
            this.keys[idx] = rightSibling.keys.shift(); // Move sibling's first key to parent
            if (!child.isLeaf) {
                child.children.push(rightSibling.children.shift()); // Move sibling's first child pointer
            }
        } else {
            // Merge with a sibling
            if (leftSibling) {
                this.merge(idx - 1); // Merge with the left sibling
            } else if (rightSibling) {
                this.merge(idx); // Merge with the right sibling
            } else {
                throw new Error("Unable to fill child; siblings are missing or invalid");
            }
        }
    }    
    

    getPredecessor(idx) {
        let current = this.children[idx];
        while (!current.isLeaf) {
            current = current.children[current.children.length - 1];
        }
        return current.keys[current.keys.length - 1];
    }

    getSuccessor(idx) {
        let current = this.children[idx + 1];
        while (!current.isLeaf) {
            current = current.children[0];
        }
        return current.keys[0];
    }

    merge(idx) {
        const child = this.children[idx];
        const sibling = this.children[idx + 1];

        child.keys.push(this.keys[idx]);
        child.keys = child.keys.concat(sibling.keys);
        if (!child.isLeaf) {
            child.children = child.children.concat(sibling.children);
        }

        this.keys.splice(idx, 1);
        this.children.splice(idx + 1, 1);
    }
}

class BTree {
    constructor(t) {
        this.t = t;
        this.root = new BTreeNode(true, t);
    }

    insert(key, path = []) {
        const root = this.root;
    
        if (root.keys.length === 2 * this.t - 1) {
            // If the root is full, split it and create a new root
            const newRoot = new BTreeNode(false, this.t);
            newRoot.children.push(root);
            newRoot.splitChild(0, path); // Pass the path to splitChild
            this.root = newRoot;
        }
    
        // Perform the actual insertion while collecting the path
        this.root.insertNonFull(key, path);
    }           
     

    find(key, node = this.root, x = canvas.width / 2, y = 50, gapX = canvas.width / 3, gapY = 100, path = []) {
        path.push({ node, x, y });

        let i = 0;
        while (i < node.keys.length && key > node.keys[i]) {
            i++;
        }

        if (i < node.keys.length && key === node.keys[i]) {
            return { found: true, path };
        }

        if (node.isLeaf) {
            return { found: false, path };
        }

        const childX = x - gapX / 2 + (gapX / (node.children.length - 1 || 1)) * i;
        const childY = y + gapY;

        return this.find(key, node.children[i], childX, childY, gapX / 2, gapY, path);
    }

    delete(key) {
        if (!this.root) return false;

        const deleted = this.root.deleteKey(key);

        if (this.root.keys.length === 0 && !this.root.isLeaf) {
            this.root = this.root.children[0];
        }

        return deleted;
    }

    clear() {
        this.root = new BTreeNode(true, this.t);
    }
}

function drawNode(ctx, x, y, node) {
    const keyCount = node.keys.length;
    const nodeWidth = Math.max(40, keyCount * 30); // Width based on key count
    const nodeHeight = 30; // Fixed height
    const radius = 10; // Corner radius

    // Draw rounded rectangle for the node
    ctx.beginPath();
    ctx.moveTo(x - nodeWidth / 2 + radius, y - nodeHeight / 2);
    ctx.lineTo(x + nodeWidth / 2 - radius, y - nodeHeight / 2);
    ctx.quadraticCurveTo(x + nodeWidth / 2, y - nodeHeight / 2, x + nodeWidth / 2, y - nodeHeight / 2 + radius);
    ctx.lineTo(x + nodeWidth / 2, y + nodeHeight / 2 - radius);
    ctx.quadraticCurveTo(x + nodeWidth / 2, y + nodeHeight / 2, x + nodeWidth / 2 - radius, y + nodeHeight / 2);
    ctx.lineTo(x - nodeWidth / 2 + radius, y + nodeHeight / 2);
    ctx.quadraticCurveTo(x - nodeWidth / 2, y + nodeHeight / 2, x - nodeWidth / 2, y + nodeHeight / 2 - radius);
    ctx.lineTo(x - nodeWidth / 2, y - nodeHeight / 2 + radius);
    ctx.quadraticCurveTo(x - nodeWidth / 2, y - nodeHeight / 2, x - nodeWidth / 2 + radius, y - nodeHeight / 2);
    ctx.closePath();

    ctx.fillStyle = "#685c8e"; // Default node color
    ctx.fill();
    ctx.strokeStyle = "#443c57";
    ctx.stroke();

    ctx.fillStyle = "#ffffff"; // Text color
    ctx.textAlign = "center";
    ctx.font = "14px Arial";

    // Draw keys inside the rectangle
    ctx.fillText(node.keys.join(", "), x, y + 5);
}

function highlightPath(path, duration = 1000) {
    let index = 0;

    function step() {
        if (index < path.length) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawTree(ctx, btree.root, canvas.width / 2, 50, canvas.width / 3, 100);

            const { node, x, y } = path[index];
            const keyCount = node.keys.length;
            const nodeWidth = Math.max(40, keyCount * 30);
            const nodeHeight = 30;
            const radius = 10;

            // Highlight the rectangle
            ctx.beginPath();
            ctx.moveTo(x - nodeWidth / 2 + radius, y - nodeHeight / 2);
            ctx.lineTo(x + nodeWidth / 2 - radius, y - nodeHeight / 2);
            ctx.quadraticCurveTo(x + nodeWidth / 2, y - nodeHeight / 2, x + nodeWidth / 2, y - nodeHeight / 2 + radius);
            ctx.lineTo(x + nodeWidth / 2, y + nodeHeight / 2 - radius);
            ctx.quadraticCurveTo(x + nodeWidth / 2, y + nodeHeight / 2, x + nodeWidth / 2 - radius, y + nodeHeight / 2);
            ctx.lineTo(x - nodeWidth / 2 + radius, y + nodeHeight / 2);
            ctx.quadraticCurveTo(x - nodeWidth / 2, y + nodeHeight / 2, x - nodeWidth / 2, y + nodeHeight / 2 - radius);
            ctx.lineTo(x - nodeWidth / 2, y - nodeHeight / 2 + radius);
            ctx.quadraticCurveTo(x - nodeWidth / 2, y - nodeHeight / 2, x - nodeWidth / 2 + radius, y - nodeHeight / 2);
            ctx.closePath();

            ctx.fillStyle = "#ff0000"; // Highlight color
            ctx.fill();
            ctx.strokeStyle = "#443c57";
            ctx.stroke();

            // Draw keys inside the highlighted rectangle
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "14px Arial";
            ctx.fillText(node.keys.join(", "), x, y + 5);

            index++;
            setTimeout(step, duration);
        }
    }

    step();
}

function drawTree(ctx, node, x, y, gapX, gapY) {
    if (!node) return;

    drawNode(ctx, x, y, node);

    if (!node.isLeaf) {
        node.children.forEach((child, index) => {
            const childX = x - gapX / 2 + (gapX / (node.children.length - 1 || 1)) * index;
            const childY = y + gapY;

            // Adjust the connection lines to avoid overlapping the rectangle
            const startY = y + 15; // Start slightly below the node rectangle
            const endY = childY - 15; // End slightly above the child rectangle

            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(childX, endY);
            ctx.stroke();
            ctx.closePath();

            drawTree(ctx, child, childX, childY, gapX / 2, gapY);
        });
    }
}

// Function to parse the tree input and degree
function parseTreeInput(input) {
    const [treeString, degreeString] = input.split("+").map((part) => part.trim());

    if (!treeString || !degreeString) {
        throw new Error("Input must include a tree structure and degree (t).");
    }

    const levels = treeString.trim().split("-").map((level) => level.trim());
    const treeData = levels.map((level, levelIndex) => {
        const nodes = level.split("|").map((node) => {
            const keys = node.split(",").map((key) => parseInt(key.trim()));
            if (keys.some(isNaN)) {
                throw new Error(`Invalid keys in input at level ${levelIndex + 1}.`);
            }
            return { keys, children: [] };
        });
        if (nodes.length === 0) {
            throw new Error(`Empty level detected at level ${levelIndex + 1}.`);
        }
        return nodes;
    });

    if (!treeData.length || !treeData[0].length || treeData[0].length !== 1) {
        throw new Error("Invalid input: root node is missing or malformed.");
    }

    const t = parseInt(degreeString);
    if (isNaN(t) || t < 2) {
        throw new Error("Invalid degree. It must be a number >= 2.");
    }

    return { treeData, t };
}

// Function to build the tree from parsed data
function buildTreeFromInput({ treeData, t }) {
    const rootData = treeData[0][0]; // Root node data

    // Create the root node
    const root = new BTreeNode(true, t);
    root.keys = rootData.keys;

    // If the tree only has the root, return it immediately
    if (treeData.length === 1) {
        return new BTree(t, root);
    }

    const queue = [root]; // Start with the root node in the queue
    let levelIndex = 1; // Start at the first level of children

    // Iterate through levels of the tree
    while (levelIndex < treeData.length) {
        const currentLevel = treeData[levelIndex]; // Get the current level data
        const parentCount = queue.length; // Number of parents in the queue
        let childIndex = 0; // Track children to attach to parents

        for (let i = 0; i < parentCount; i++) {
            const parent = queue.shift(); // Get the current parent node
            const numChildren = parent.keys.length + 1; // Expected children for a B-tree node

            // Validate the number of children in the current level
            if (childIndex + numChildren > currentLevel.length){
                throw new Error("Invalid tree structure: insufficient or excessive children.");
            }

            // Attach children to the parent node
            for (let j = 0; j < numChildren; j++) {
                const childData = currentLevel[childIndex++];
                const childNode = new BTreeNode(true, t);
                childNode.keys = childData.keys;
                parent.children.push(childNode);

                // Add the child node to the queue for the next level
                if (levelIndex + 1 < treeData.length) {
                    queue.push(childNode);
                }
            }

            // Set parent as non-leaf if it has children
            parent.isLeaf = parent.children.length === 0;
        }

        // Move to the next level
        levelIndex++;
    }

    const newTree = new BTree(t);
    newTree.root = root;
    return newTree;
}

function customDialog(message, isSuccess = true) {
    const dialogBox = document.getElementById("message-dialog");
    dialogBox.textContent = message;
    dialogBox.style.backgroundColor = isSuccess ? "#d1c4e9" : "#ffebee"; // Different styling for the custom dialog
    dialogBox.style.color = isSuccess ? "#4527a0" : "#d32f2f";
    dialogBox.style.borderColor = isSuccess ? "#311b92" : "#c62828";
}

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("tree-canvas");
    ctx = canvas.getContext("2d");
    btree = new BTree(t);

    const dialogBox = document.getElementById("message-dialog");

    function updateDialog(message, isSuccess = true) {
        dialogBox.textContent = message;
        dialogBox.style.backgroundColor = isSuccess ? "#e8f5e9" : "#ffebee";
        dialogBox.style.color = isSuccess ? "#388e3c" : "#d32f2f";
        dialogBox.style.borderColor = isSuccess ? "#2e7d32" : "#c62828";
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (btree.root.keys.length > 0 || !btree.root.isLeaf) {
            drawTree(ctx, btree.root, canvas.width / 2, 50, canvas.width / 3, 100);
        }
    }

    document.getElementById("insert-button").addEventListener("click", () => {
        const value = parseInt(document.getElementById("value-input").value);
        if (!isNaN(value)) {
            const path = []; // Collect the path during insertion
    
            // Perform insertion and collect path
            btree.insert(value, path);
    
            // Highlight the path to the inserted key using the path's precomputed coordinates
            highlightPath(path);
    
            // Redraw the tree after animation completes
            setTimeout(() => {
                render(); // Draw the updated tree
                updateDialog("Key added successfully!");
            }, path.length * 1000); // Wait for animation to complete
        } else {
            updateDialog("Invalid input.", false);
        }
    });

    document.getElementById("find-button").addEventListener("click", () => {
        const value = parseInt(document.getElementById("value-input").value);

        if (!isNaN(value)) {
            const result = btree.find(value);

            if (result.found) {
                updateDialog("Key found successfully!");
                highlightPath(result.path);
                setTimeout(() => {
                    render(); // Draw the updated tree
                }, result.path.length * 1000); // Wait for animation to complete
            } else {
                updateDialog("Key not found.", false);
            }
        } else {
            updateDialog("Invalid input.", false);
        }
    });

    document.getElementById("delete-button").addEventListener("click", () => {
        const value = parseInt(document.getElementById("value-input").value);
        if (!isNaN(value)) {
            const deleted = btree.delete(value);
            if (deleted) {
                updateDialog("Key deleted successfully!");
                render();
            } else {
                updateDialog("Key not found.", false);
            }
        }
    });

    document.getElementById("clear-button").addEventListener("click", () => {
        btree.clear();
        updateDialog("Tree cleared!");
        render();
    });

    document.getElementById("set-degree-button").addEventListener("click", () => {
        const newDegree = parseInt(document.getElementById("degree-input").value);
        if (!isNaN(newDegree) && newDegree > 1) {
            if (btree.root.keys.length === 0) {
                t = newDegree;
                btree = new BTree(t);
                updateDialog("Tree degree set to " + String(t));
                render();
            } else {
                updateDialog("Cannot change degree while tree contains nodes.", false);
            }
        } else {
            updateDialog("Invalid degree.", false);
        }
    });

    document.getElementById("import-btn").addEventListener("click", () => {
        const input = prompt(
            "Enter your tree structure:\nUse '-' to indicate a new line.\nExample: 3-2|4,4 + t"
        );
    
        if (!input) {
            customDialog("Tree import cancelled or invalid input.", false);
            return;
        }
    
        try {
            btree.clear();
            render();
            // Parse the input and build the tree
            const { treeData, t } = parseTreeInput(input);
            console.log("Tree Data:", treeData);
            const newTree = buildTreeFromInput({ treeData, t });
    
            // Replace the current tree with the new one
            btree = newTree;
    
            // Redraw the tree
            render();
            customDialog("Tree imported successfully!");
        } catch (error) {
            customDialog(`Error importing tree: ${error.message}`, false);
        }
    });
    
    // Theme toggle button
    const themeToggleButton = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const body = document.body;

    themeToggleButton.addEventListener("click", () => {
        if (body.classList.contains("dark-mode")) {
            body.classList.remove("dark-mode");
            themeIcon.textContent = "🌞";
        } else {
            body.classList.add("dark-mode");
            themeIcon.textContent = "🌙";
        }
    });
});