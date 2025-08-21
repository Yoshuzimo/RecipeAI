
# Prompt for Rewriting CookSmart Application in Swift

## Project Overview

You are tasked with rewriting a web application called "CookSmart" into a native Swift application. The goal is to create a native experience for iOS, iPadOS, and potentially macOS using SwiftUI and modern Swift practices. The application is a smart meal planner and inventory management tool that uses AI to provide personalized suggestions.

The core of the application revolves around managing a user's kitchen inventory, planning meals, generating shopping lists, and tracking nutrition, all with the help of a generative AI backend.

---

## 1. Core Features & App Structure

The application should have a primary navigation interface (e.g., a `TabView` or `NavigationView` with a sidebar) that gives access to the following pages:

-   **Overview**: A dashboard showing a summary of the user's nutritional intake for the day, and key inventory stats (total items, items expiring soon, expired items).
-   **Meal Planner**: The main interaction point with the AI. Users can get meal suggestions based on their inventory, preferences, and mood. They can adjust serving sizes, find ingredient substitutions, and log cooked meals.
-   **Inventory**: Displays all the user's food items, grouped by storage location (Fridge, Freezer, Pantry). Users can add, edit, and remove items.
-   **Shopping List**: A smart shopping list. It has a section for manually added items, a section for automatically suggested restocks, and a section for AI-generated shopping ideas based on user habits and preferences.
-   **Nutrition**: A page for visualizing the user's macronutrient intake over different timeframes (daily, weekly, monthly).
-   **Saved Recipes**: A place to view recipes that the user has bookmarked from the meal planner. (Currently a placeholder).
-   **Personal Details**: A form where the user inputs their health goals, dietary restrictions, allergies, and food preferences. This data is crucial for personalizing AI suggestions.
-   **Subscriptions**: A page displaying subscription tiers. (Currently a placeholder for a premium plan).
-   **Settings**: A page to configure app settings, such as the unit system (US/Metric), and to manage custom storage locations (e.g., add a "Garage Fridge").

---

## 2. Data Models

Define the following data models as `Codable` Swift structs. These will be used throughout the app and for API communication.

```swift
import Foundation

// Used for settings and API calls
enum UnitSystem: String, Codable {
    case us, metric
}

// Represents a physical storage location
struct StorageLocation: Codable, Identifiable {
    var id: String
    var name: String
    var type: LocationType
}

enum LocationType: String, Codable {
    case Fridge, Freezer, Pantry
}

// Represents a single package or item in the inventory
struct InventoryItem: Codable, Identifiable {
    var id: String
    var name: String
    var packageSize: Double
    var packageCount: Int
    var unit: Unit
    var expiryDate: Date
    var locationId: String
}

enum Unit: String, Codable {
    case g, kg, ml, l, pcs, oz, lbs // pcs for "pieces"
    case fl_oz = "fl oz"
    case gallon
}

// User's sensitive and preference data
struct PersonalDetails: Codable {
    var healthGoals: String?
    var dietaryRestrictions: String?
    var allergies: String?
    var favoriteFoods: String?
    var dislikedFoods: String?
    var healthConditions: String?
    var medications: String?
}

// Nutritional information
struct Macros: Codable {
    var protein: Double
    var carbs: Double
    var fat: Double
}

// A single recipe structure
struct Recipe: Codable {
    var title: string
    var description: string
    var servings: Int
    var ingredients: [String]
    var instructions: [String]
    var macros: Macros
}

// A shopping list item suggested by the AI
struct ShoppingListItem: Codable {
    var item: String
    var quantity: String
    var reason: String
}
```

---

## 3. UI/UX Guidelines & Components

-   **Framework:** Use **SwiftUI** for the entire user interface.
-   **Design:** The app should have a modern, clean, and intuitive design. Use cards, rounded corners, and subtle shadows.
-   **Color Scheme:** The app uses a soft, health-focused color palette. Here are the key colors (use these to create a theme):
    -   `background`: #F2F4F3
    -   `primary`: #A7D1AB (a soft green)
    -   `accent`: #EAC4A5 (a light tan/peach)
-   **Component Recreation:** Replicate the functionality of the existing UI components in SwiftUI:
    -   **Cards:** For displaying all primary content sections.
    -   **Dialogs/Alerts:** For adding/editing items, confirming actions, and logging meals.
    -   **Forms:** For user input (e.g., Settings, Personal Details, Add Item).
    -   **Collapsible Sections (Accordion):** For the Inventory page (to show/hide Fridge, Freezer, Pantry) and for recipe details in the Meal Planner.
    -   **Charts:** Use the `Charts` framework in SwiftUI to replicate the bar charts on the Overview and Nutrition pages.

---

## 4. Backend & AI Integration

The Swift app will communicate with a backend that hosts the AI logic. You need to define a networking layer to make API calls to this backend. The backend will expose endpoints that mirror the functionality of the existing Genkit flows.

### **API Endpoint: `/generateMealSuggestions`**

-   **Method**: `POST`
-   **Description**: Generates meal suggestions. It has two modes: generating new recipes or adjusting an existing one.
-   **Request Body (JSON)**:
    ```json
    {
      "cravingsOrMood": "string?",
      "currentInventory": "string", // A formatted string of all inventory items
      "expiringIngredients": "string", // A formatted string of expiring items
      "unitSystem": "us" | "metric",
      "personalDetails": "string", // JSON string of PersonalDetails object
      "todaysMacros": { "protein": "number", "carbs": "number", "fat": "number" },
      "recipeToAdjust": "Recipe?", // A Recipe object if adjusting
      "newServingSize": "number?"
    }
    ```
-   **Response Body (JSON)**:
    ```json
    {
        "suggestions": [
            // Array of Recipe objects
        ]
    }
    ```

### **API Endpoint: `/generateSubstitutions`**

-   **Method**: `POST`
-   **Description**: Suggests ingredient substitutions for a given recipe.
-   **Request Body (JSON)**:
    ```json
    {
        "recipe": "Recipe", // The recipe needing substitutions
        "ingredientsToReplace": ["string"],
        "currentInventory": "string",
        "personalDetails": "string",
        "unitSystem": "us" | "metric",
        "allowExternalSuggestions": "boolean"
    }
    ```
-   **Response Body (JSON)**:
    ```json
    {
        "substitutions": [
            {
                "originalIngredient": "string",
                "suggestedSubstitutions": ["string"]
            }
        ]
    }
    ```

### **API Endpoint: `/generateShoppingList`**

-   **Method**: `POST`
-   **Description**: Generates a personalized shopping list.
-   **Request Body (JSON)**:
    ```json
    {
        "currentInventory": "string",
        "personalDetails": "string",
        "consumptionHistory": "string", // e.g., "User has eaten a lot of chicken this month."
        "unitSystem": "us" | "metric"
    }
    ```
-   **Response Body (JSON)**:
    ```json
    {
        "shoppingList": [
            // Array of ShoppingListItem objects
        ]
    }
    ```

### **API Endpoint: `/logCookedMeal`**

-   **Method**: `POST`
-   **Description**: Logs a cooked meal, which involves calculating consumed macros and determining how inventory should be updated.
-   **Request Body (JSON)**:
    ```json
    {
        "recipe": "Recipe",
        "currentInventory": "string",
        "servingsEaten": "number", // Servings eaten by the user
        "servingsEatenByOthers": "number",
        "fridgeLeftovers": [ { "locationId": "string", "servings": "number" } ],
        "freezerLeftovers": [ { "locationId": "string", "servings": "number" } ],
        "unitSystem": "us" | "metric"
    }
    ```
-   **Response Body (JSON)**:
    ```json
    {
        "updatedInventory": "string", // A human-readable string describing the inventory changes
        "leftoverItems": [
            {
                "name": "string", // e.g., "Leftover - Chicken Curry"
                "quantity": "number", // Number of servings
                "locationId": "string"
            }
        ],
        "macrosConsumed": { "protein": "number", "carbs": "number", "fat": "number" }
    }
    ```
    
This prompt should provide a comprehensive blueprint for a Swift developer or AI to recreate the application with high fidelity.