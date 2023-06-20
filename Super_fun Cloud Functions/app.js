const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Function to create an array of departments containing the user's products
exports.getGroceryKeys = functions.https.onCall(async (data, context) => {
    try {
        // Get the list of products from the data parameter
        const productList = data.products;

        // Create a reference to the database
        const db = admin.database();

        // Function to return the department of the given product
        const fetchProductDepartment = async (productName) => {
            const snap = await db.ref("data/Departments").once("value");

            // Loop to iterate over the departments in the db
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

        // Map over the products list and fetch the keys
        const productDepartmentPromises = productList.map((productName) =>
            fetchProductDepartment(productName),
        );

        // Wait for all the promises to resolve and create the set of deparments
        const productDepartments = await Promise.all(productDepartmentPromises);

        // Create a set to avoid duplicates
        const uniqueProductDepartments = new Set(productDepartments);

        // Return an array of departments
        return Array.from(uniqueProductDepartments);
    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

// Function to create an array of the products of the given department
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

        // Get a reference to the given department
        const departmentSnapshot = await db.ref(`data/Departments/${departmentName}`).once("value");
        const department = departmentSnapshot.val();

        // Get a list of products of the given department
        const departmentItemsString = department.items;

        // Remove the opening and closing curly braces
        const trimmedItemsString = departmentItemsString.slice(1, -1);

        // Split the string by comma and trim whitespace from each element
        const departmentItemsArray = trimmedItemsString.split(',').map(item => item.trim());

        // Get the department's products exist in the user's list
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

// Defining a PriorityQueue class for Dijkstra's algorithm
class PriorityQueue {
    constructor() {
        this.queue = [];
    }

    // Function to add an element to the queue
    enqueue(element, priority) {
        const item = { element, priority };
        let added = false;

        for (let i = 0; i < this.queue.length; i++) {
            if (item.priority < this.queue[i].priority) {
                this.queue.splice(i, 0, item);
                added = true;
                break;
            }
        }

        if (!added) {
            this.queue.push(item);
        }
    }

    // Function to delete an element from the queue
    dequeue() {
        if (this.isEmpty()) {
            return null;
        }

        return this.queue.shift();
    }

    // Function to check whether the queue is empty
    isEmpty() {
        return this.queue.length === 0;
    }
}

// Function to calculate the distance of the shortest path from start to end
function calculateDistanceOfShortestPath(graph, start, end) {
    // Create a priority queue to store the nodes and their distances
    const queue = new PriorityQueue();

    // Create an object to store the distances from the start node to each node
    const distances = {};

    // Get the vertices of the graph
    const vertices = Array.from(Object.keys(graph));

    // Set the distance of the start node to 0
    distances[start] = 0;

    // Initialize the distances to infinity
    vertices.forEach(vertex => {
        if (vertex !== start) {
            distances[vertex] = Infinity;
        }
    });

    // Enqueue the start node with priority 0
    queue.enqueue(start, 0);

    // Loop until the queue is empty
    while (!queue.isEmpty()) {
        // Dequeue the node with the lowest distance
        const { element: current, priority: currentDistance } = queue.dequeue();

        // Stop if we reach the end node
        if (current === end) break;

        // Check the neighbors of the current node
        for (const neighbor in graph[current]) {
            // Calculate the new distance from the start node to the neighbor node
            const distance = currentDistance + graph[current][neighbor];

            // If the new distance is shorter than the current distance, update it
            if (distance < distances[neighbor]) {
                distances[neighbor] = distance;

                // Enqueue the neighbor node with the new priority (distance)
                queue.enqueue(neighbor, distance);
            }
        }
    }

    // Return the distance of the shortest path between the start and end nodes
    return distances[end];
}


// Function to calculate the shortest path from start to end
function calculateShortestPath(graph, start, end) {
    // Create a priority queue to store the nodes and their distances
    const queue = new PriorityQueue();

    // Create an object to store the distances from the start node to each node
    const distances = {};

    // Create an object to store the previous node in the shortest path
    const previous = {};

    // Get the vertices of the graph
    const vertices = Array.from(Object.keys(graph));

    // Set the distance of the start node to 0
    distances[start] = 0;

    // Initialize the distances to inifinity and the previous node of each node to null
    vertices.forEach(vertex => {
        if (vertex !== start) {
            distances[vertex] = Infinity;
        }
        previous[vertex] = null;
    });

    // Enqueue the start node with priority 0
    queue.enqueue(start, 0);

    // Loop until the queue is empty
    while (!queue.isEmpty()) {
        // Dequeue the node with the highest priority (lowest distance)
        const current = queue.dequeue().element;

        // Stop if we reach the end node
        if (current === end) break;

        // Check the neighbors of the current node
        for (const neighbor in graph[current]) {
            // Calculate the new distance from the start node to the neighbor node
            const distance = distances[current] + graph[current][neighbor];

            // If the new distance is shorter than the current distance, update it
            if (distance < distances[neighbor]) {
                distances[neighbor] = distance;
                previous[neighbor] = current;
                // Enqueue the neighbor node with the new priority (distance)
                queue.enqueue(neighbor, distance);
            }
        }

        // Check if the end node is a neighbor of the current node
        if (end in graph[current]) {
            const distanceToEnd = distances[current] + graph[current][end];
            if (distanceToEnd < distances[end]) {
                distances[end] = distanceToEnd;
                previous[end] = current;
            }
        }
    }

    // Build the shortest path by backtracking from the end node to the start node
    const shortestPath = [];
    let current = end;

    while (current !== null) {
        shortestPath.unshift(current);
        current = previous[current];
    }

    return shortestPath;
}


// Function to find the shortest route of the user in the supermarket
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

        // Initialize a Short Path Vector (SPV) containing the start point
        const startPoint = 'Entrance';
        const SPV = [startPoint];

        // Set startPoint as a temporary start point
        let tempPoint = startPoint;

        // Calculate the forward path for all departments that must be visited 
        while (departments.length > 0) {
            let shortestDistance = Infinity;
            let closestPoint;

            // Find the shortest path using Dijkstra's algorithm
            // from the temporary start point to all points in departments
            for (const department of departments) {
                // Calculate the distance from tempPoint to department
                const distance = calculateDistanceOfShortestPath(graph, tempPoint, department);
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    closestPoint = department;
                }
            }
            // Take the shortest calculated path and add it to SPV
            SPV.push(closestPoint);

            // Delete the closest point from the list of points to visit
            if (departments.includes(closestPoint)) {
                departments.splice(departments.indexOf(closestPoint), 1);
            }

            // Set the closest point as temporary start point
            tempPoint = closestPoint;
        }

        // Use Dijkstra's algorithm to find the path from the last point in SPV to startPoint
        const shortestPathBack = calculateShortestPath(graph, SPV[SPV.length - 1], startPoint);

        // The SPV is the forward path, and shortestPathBack is the path for returning to the start point
        const fullPath = [...SPV, ...shortestPathBack.slice(1)];

        return fullPath;

    } catch (error) {
        // Handle any errors
        console.error('Error:', error);
        // replace "error" to null at the end
        return "error";
    }
}

// Function to find the intersection of departments and routeOnGraph according to the order of routeOnGraph
function getIntersection(departments, routeOnGraph) {
    const intersection = [];
    for (const element of routeOnGraph) {
        if (departments.includes(element) && !intersection.includes(element)) {
            intersection.push(element);
        }
    }
    return intersection;
}

// Function to create an array of departments according to the order of the shortest path
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

        // Get the list of departments on the user's route
        const departmentListString = client.all_departments;

        // Remove the opening and closing curly braces
        const trimmedString = departmentListString.slice(1, -1);

        // Split the string by comma and trim whitespace from each element
        const departmentArray = trimmedString.split(',').map(item => item.trim());

        // Create an array of departments
        const departments = Array.from(departmentArray);

        // Call the findShortestRoute function
        const shortestRouteInGraph = await findShortestRoute(departmentArray);

        // Get the intersection of departments and the output of findShortestRoute
        const shortestRoute = getIntersection(departments, shortestRouteInGraph);

        return shortestRoute;

    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

// Function to check whether the given product exist in the DB
exports.isProductExist = functions.https.onCall(async (data, context) => {
    try {
        // Get the product from the data parameter
        const product = data.product;

        // Create a reference to the database
        const db = admin.database();

        // Get the departments data
        const snapshot = await db.ref("data/Departments").once("value");
        const departments = snapshot.val();

        // Loop through each department
        for (const department in departments) {
            // Get the list of items of the department
            const itemsString = departments[department].items || {};

            // Remove the opening and closing curly braces
            const trimmedString = itemsString.slice(1, -1);

            // Split the string by comma and trim whitespace from each element
            const itemsArray = trimmedString.split(",").map(item => item.trim());

            // Check whether the department includes the product 
            if (itemsArray.includes(product)) {
                return { result: "The product exists." };
            }
        }

        throw new Error("The product doesn't exist.");
    } catch (error) {
        console.error('Error checking product:', error);
        throw new functions.https.HttpsError('internal', 'Internal Server Error');
    }
});




