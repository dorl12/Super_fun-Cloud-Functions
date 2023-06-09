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

        // Get a reference to the user ID in the Realtime Database
        //const userRef = db.ref(`data/Clients/${data.userId}`);
        // Add the set of classes to the user ID in the Realtime Database
        /*await userRef.set({
          classes_set: Array.from(uniqueProductDepartments),
        });*/
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

        const productString = client.products;

        // Remove the opening and closing curly braces
        const trimmedString = productString.slice(1, -1);

        // Split the string by comma and trim whitespace from each element
        const productArray = trimmedString.split(',').map(item => item.trim());

        const departmentSnapshot = await db.ref(`data/Departments/'${departmentName}'/items`).once("value");
        const departmentItems = departmentSnapshot.val() || [];

        const departmentProducts = productArray.filter(product => departmentItems.includes(product));

        return departmentProducts;

    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

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

        return departmentArray;

    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});