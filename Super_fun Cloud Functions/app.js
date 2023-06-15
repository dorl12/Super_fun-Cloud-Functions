const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.getGroceryKeys = functions.https.onCall(async (data, context) => {
    try {
        // Get the list of groceries from the data parameter
        const productList = data.products;

        // Create a reference to the database
        const db = admin.database();

        const fetchProductDepartment = async (productName) => {
            const snap = await db.ref("data/Departments").once("value");

            // This loop iterates over children of Departments
            const children = snap.val();
            for (const childNodeKey in children) {
                if (Object.hasOwnProperty.call(children, childNodeKey)) {
                    const childNode = children[childNodeKey];
                    if (childNode.items.includes(productName)) {
                        return childNodeKey;
                    }
                }
            }

            throw new Error(`Product '${productName}' not found`);
        };

        // Map over the grocery list and fetch the keys
        const productDepartmentPromises = productList.map((productName) =>
            fetchProductDepartment(productName),
        );

        // Wait for all the promises to resolve and return the set of keys
        const productDepartments = await Promise.all(productDepartmentPromises);
        const uniqueProductDepartments = new Set(productDepartments);

        return Array.from(uniqueProductDepartments);
    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.getDepartmentItems = functions.https.onCall(async (data, context) => {
    try {
        // Get the ID of the user from the data parameter
        const userId = data.userId;

        // Get the name of the department from the data parameter
        const departmentName = data.departmentName;

        // Create a reference to the database
        const db = admin.database();

        // Retrieve the client node based on the provided userId
        const clientsSnapshot = await db.ref("data/Clients").child(userId).once("value");
        const client = clientsSnapshot.val();

        if (!client || !client.products) {
            return [];
        }

        // Get the list of the products of the client
        const productString = client.products;

        // Remove the opening and closing curly braces
        const trimmedProductString = productString.slice(1, -1);

        // Split the string by comma and trim whitespace from each element
        const productArray = trimmedProductString.split(',').map(item => item.trim());

        const departmentSnapshot = await db.ref(`data/Departments/${departmentName}`).once("value");
        const department = departmentSnapshot.val();

        const departmentItemsString = department.items;

        // Remove the opening and closing curly braces
        const trimmedItemsString = departmentItemsString.slice(1, -1);

        // Split the string by comma and trim whitespace from each element
        const departmentItemsArray = trimmedItemsString.split(',').map(item => item.trim());

        const departmentProducts = productArray.filter(product => departmentItemsArray.includes(product));

        return departmentProducts;

    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

// Function to create points from the representive string of points in the DB
function parsePointsFromString(str) {
    // Remove the outer curly braces
    const trimmedStr = str.slice(1, -1);

    // Split the string by the comma and parentheses to get individual point strings
    const pointStrings = trimmedStr.split(/\),\s?\(/);

    // Parse each point string into an object with x and y properties
    const points = pointStrings.map(pointString => {
        // Remove the parentheses and split by comma to get the x and y values
        const [x, y] = pointString.replace(/[()]/g, '').split(',');

        return [parseFloat(x), parseFloat(y)];
    });

    return points;
}

// Function to calculate Euclidean distance between two points
function calculateDistance(point1, point2) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Function to find the shortest route
async function findShortestRoute(departments) {

    // Reference to the Firebase Realtime Database
    const db = admin.database().ref("data");

    try {
        // Get the vertex data
        const vertexSnapshot = await db.child("Map/Vertex").once("value");
        const vertices = vertexSnapshot.val();

        // Get the edge data
        const edgeSnapshot = await db.child("Map/Edges").once("value");
        const edges = edgeSnapshot.val();

        // Create a graph object
        const graph = {};

        // Add vertices to the graph
        for (const department in vertices) {
            //const departmentPositionString = vertices[department];
            //const trimmedString = departmentPositionString.slice(1, -1);
            //const [xStr, yStr] = trimmedString.split(',').map(value => value.trim());
            //const x = Number(xStr);
            //const y = Number(yStr);
            //graph[department] = { x, y };
            graph[department] = {};
        }

        // Add edges to the graph with their costs
        for (const edge in edges) {
            const [department1, department2] = edge.split('&');
            const pointsString = edges[edge];
            const pointsList = parsePointsFromString(pointsString);
            const cost = calculateDistance(pointsList[0], pointsList[1]);
            graph[department1][department2] = cost;
            graph[department2][department1] = cost;
        }

        /*        // Perform a breadth-first search (BFS) to find the shortest route
                const queue = [['Entrance', [], 0]];
                //const visited = new Set(['Entrance']);
        
                ////////////////is it okay that visited is an array instead of set//////////////////////////
                const visited = ['Entrance'];
                //const departmentsArray = new Set(departments);
                const targetDepartments = new Array();
                departments.forEach((department) => {
                    targetDepartments.push(department);
                });
                let shortestRoute = null;
                let minCost = Infinity;
        
                // Continue from here!!!
        
                while (queue.length > 0) {
                    const [current, path, currentCost] = queue.shift();
        
                    // Check if the current node is in the target departments set
                    if (targetDepartments.includes(current)) {
                        const index = targetDepartments.indexOf(current);
                        targetDepartments.splice(index, 1);
                    }
                    
                    // Check if the current node is 'Exit' and the route includes all the departments
                    if (current === 'Exit') {
                        //return "current===Exit";
                        if (currentCost < minCost && targetDepartments.size === 0) {
                            return "currentCost < minCost && targetDepartments.size === 0";
                            shortestRoute = path;
                            minCost = currentCost;
                        }
                    }
        
                    // Get the neighbors of the current node
                    const neighbors = Object.keys(graph[current]);
        
                    // Enqueue unvisited neighbors
                    for (const neighbor of neighbors) {
                        if (!visited.includes(neighbor)) {
                            visited.push(neighbor);
                            const neighborCost = currentCost + graph[current][neighbor];
                            queue.push([neighbor, [...path, neighbor], neighborCost]);
                        }
                    }
                }
        
                // Return the shortest route
                return shortestRoute;*/
        // Perform a breadth-first search (BFS) to find the shortest route
        /*        const queue = [['Entrance', [], 0, [...departments]]];
                const visited = ['Entrance'];
        
                while (queue.length > 0) {
                    const [current, path, currentCost, remainingDepartments] = queue.shift();
        
                    // Check if all departments have been visited
                    if (remainingDepartments.length === 0) {
                        let isValidPath = true;
                        for (const department of departments) {
                            if (!path.includes(department)) {
                                isValidPath = false;
                                break;
                            }
                        }
        
                        if (isValidPath) {
                            return path;
                        }
                    }
        
                    // Get the neighbors of the current node
                    const neighbors = Object.keys(graph[current]);
        
                    // Enqueue unvisited neighbors
                    for (const neighbor of neighbors) {
                        if (!visited.includes(neighbor)) {
                            const updatedRemainingDepartments = remainingDepartments.filter(dep => dep !== neighbor);
                            visited.push(neighbor);
                            const neighborCost = currentCost + graph[current][neighbor];
                            queue.push([neighbor, [...path, neighbor], neighborCost, updatedRemainingDepartments]);
                        }
                    }
                }
        
                // If no valid path is found
                return null;*/
        // Perform a breadth-first search (BFS) to find the shortest route
        const queue = [['Entrance', [], 0, [...departments]]];
        const visited = ['Entrance'];
        let lowestCost = Infinity;
        let lowestPath = [];

        while (queue.length > 0) {
            const [current, path, currentCost, remainingDepartments] = queue.shift();

            // Check if all departments have been visited
            if (remainingDepartments.length === 0) {
                let isValidPath = true;
                for (const department of departments) {
                    if (!path.includes(department)) {
                        isValidPath = false;
                        break;
                    }
                }

                if (isValidPath && currentCost < lowestCost) {
                    lowestCost = currentCost;
                    lowestPath = path;
                }
            }

            // Get the neighbors of the current node
            const neighbors = Object.keys(graph[current]);

            // Enqueue unvisited neighbors
            for (const neighbor of neighbors) {
                if (!visited.includes(neighbor)) {
                    const updatedRemainingDepartments = remainingDepartments.filter(dep => dep !== neighbor);
                    visited.push(neighbor);
                    const neighborCost = currentCost + graph[current][neighbor];
                    queue.push([neighbor, [...path, neighbor], neighborCost, updatedRemainingDepartments]);
                }
            }
        }

        // If a valid path with the lowest cost is found
        if (lowestPath.length > 0) {
            return lowestPath;
        }

        // If no valid path is found
        return null;
    } catch (error) {
        // Handle any errors
        console.error('Error:', error);
        // replace "error" to null at the end
        return "error";
    }
}

exports.getDepartmentsByOrder = functions.https.onCall(async (data, context) => {
    try {
        // Get the ID of the user from the data parameter
        const userId = data.userId;

        // Create a reference to the database
        const db = admin.database();

        // Retrieve the client node based on the provided userId
        const clientsSnapshot = await db.ref("data/Clients").child(userId).once("value");
        const client = clientsSnapshot.val();

        if (!client || !client.all_departments) {
            return [];
        }

        const departmentListString = client.all_departments;

        // Remove the opening and closing curly braces
        const trimmedString = departmentListString.slice(1, -1);

        // Split the string by comma and trim whitespace from each element
        const departmentArray = trimmedString.split(',').map(item => item.trim());

        // Call the findShortestRoute function
        const shortestRouteInGraph = await findShortestRoute(departmentArray);

        return shortestRouteInGraph;

        // Find the intersection between the original array of departments and the nodes of the graph
        const intersectionWithOrder = new Set(departmentArray);
        const shortestRoute = shortestRouteInGraph.filter(element => intersectionWithOrder.has(element));

        return shortestRoute;

    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.isProductExist = functions.https.onCall(async (data, context) => {
    try {
        // Get the product from the data parameter
        const product = data.product;

        // Create a reference to the database
        const db = admin.database();

        const snapshot = await db.ref("data/Departments").once("value");
        const departments = snapshot.val();

        // Loop through each department
        for (const department in departments) {

            // Get the list of items of the department
            const itemsString = departments[department].items || {};

            // Remove the opening and closing curly braces
            const trimmedString = itemsString.slice(1, -1);

            // Split the string by comma and trim whitespace from each element
            const itemsArray = trimmedString.split(',').map(item => item.trim());

            if (itemsArray.includes(product)) {
                return { result: 'The product exists.' };
            }
        }

        return { error: "The product doesn't exist." };
    } catch (error) {
        console.error('Error checking product:', error);
        return { error: 'Internal Server Error' };
    }
});



