# Super_fun-Cloud-Functions
A serverless framework that allows you automatically run backend code in response to events triggered by HTTPS requests.
In this project, the following functions are triggered by the flutter app to support list products insertion and building the shortest route for the customer to pick the products he wants to buy.
The functions:
getGroceryKeys - gets the list of products of the customer and returns an array of departments containing those products.
getDepartmentItems - gets a name of department and returns an array of the products of the given department.
getDepartmentsByOrder - gets a list of departments and returns an array of departments according to the order of the shortest path in the supermarket.
isProductExist - The function gets a name of a product and checks whether the product exist in the DB.

