# Super_fun-Cloud-Functions  
SuperFun is a platform for shoppers that is user friendly. SuperFun will map the user's product list according to departments and calculate the shortest route allowing the user to shop more effectively and efficiently.  

Cloud Functions are a serverless framework that allows you automatically run backend code in response to events triggered by HTTPS requests.  

In this project, the following functions are triggered by the flutter app to support list products insertion and building
the shortest route for the customer to pick the products he wants to buy.  

The main functions:  

getGroceryKeys - gets the list of products of the customer and returns an array of departments containing those products.  

getDepartmentItems - gets a name of department and returns an array of the products of the given department.  

getDepartmentsByOrder - gets a list of departments and returns an array of departments according to the order of the shortest path in the supermarket.  

isProductExist - The function gets a name of a product and checks whether the product exist in the DB.  

How to run the functions:
1. Clone the repository
2. Set up Firebase project
3. Set up Firebase Admin SDK
4. Install dependencies
5. Configure Firebase Admin SDK
6. Deploy Cloud Functions
7. Test the Cloud Functions

