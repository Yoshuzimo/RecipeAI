# Prompt for Rewriting CookSmart Application in Flutter

## Project Overview

You are tasked with creating a Flutter application that serves as a mobile client for the "CookSmart" web application. The goal is to create a native experience for iOS and Android using Flutter and modern Dart practices, particularly Material 3 design. The application is a smart meal planner and inventory management tool that uses a generative AI backend, which is exposed via a set of REST APIs.

---

## 1. Core Features & App Structure

The application should have a primary navigation interface (e.g., a `Scaffold` with a `BottomNavigationBar`) that gives access to the following pages:

-   **Overview**: A dashboard showing a summary of the user's nutritional intake for the day and key inventory stats (total items, items expiring soon, expired items).
-   **Meal Planner**: The main interaction point with the AI. Users can get meal suggestions based on their inventory and preferences. They can adjust serving sizes, find ingredient substitutions, and log cooked meals.
-   **Inventory**: Displays all the user's food items, grouped by storage location (Fridge, Freezer, Pantry) and by privacy (Shared vs. Private). Users can add, edit, and remove items.
-   **Shopping List**: A smart shopping list with sections for manually added items and AI-generated suggestions.
-   **Nutrition**: A page for visualizing the user's macronutrient intake over different timeframes.
-   **Saved Recipes**: A place to view recipes that the user has bookmarked.
-   **Household**: A section to manage the user's household, including viewing members, handling join requests, and leaving the group.
-   **Settings & Details**: A combined page to manage personal details (for the AI), app settings (like unit system), and storage locations.

---

## 2. Data Models

Define the following data models as Dart classes with `fromJson` and `toJson` methods for serialization. Use packages like `json_annotation` for robust serialization.

```dart
import 'package:flutter/foundation.dart';
import 'package:json_annotation/json_annotation.dart';

part 'models.g.dart'; // Assuming you use json_serializable

@JsonSerializable()
class StorageLocation {
  final String id;
  final String name;
  final String type; // "Fridge", "Freezer", "Pantry"

  StorageLocation({required this.id, required this.name, required this.type});
  factory StorageLocation.fromJson(Map<String, dynamic> json) => _$StorageLocationFromJson(json);
  Map<String, dynamic> toJson() => _$StorageLocationToJson(this);
}

@JsonSerializable()
class InventoryItem {
  final String id;
  final String name;
  final double originalQuantity;
  final double totalQuantity;
  final String unit; // e.g., "g", "pcs", "lbs"
  final DateTime? expiryDate;
  final String locationId;
  final bool isPrivate;

  InventoryItem({
    required this.id,
    required this.name,
    required this.originalQuantity,
    required this.totalQuantity,
    required this.unit,
    this.expiryDate,
    required this.locationId,
    required this.isPrivate,
  });
  factory InventoryItem.fromJson(Map<String, dynamic> json) => _$InventoryItemFromJson(json);
  Map<String, dynamic> toJson() => _$InventoryItemToJson(this);
}

// Grouping for private and shared items
class InventoryData {
    final List<InventoryItem> privateItems;
    final List<InventoryItem> sharedItems;

    InventoryData({required this.privateItems, required this.sharedItems});
    factory InventoryData.fromJson(Map<String, dynamic> json) {
        return InventoryData(
            privateItems: (json['privateItems'] as List).map((i) => InventoryItem.fromJson(i)).toList(),
            sharedItems: (json['sharedItems'] as List).map((i) => InventoryItem.fromJson(i)).toList(),
        );
    }
}


@JsonSerializable()
class Recipe {
  final String title;
  final String description;
  final int servings;
  final List<String> ingredients;
  final List<String> instructions;
  final Macros macros;

  Recipe({
    required this.title,
    required this.description,
    required this.servings,
    required this.ingredients,
    required this.instructions,
    required this.macros,
  });
  factory Recipe.fromJson(Map<String, dynamic> json) => _$RecipeFromJson(json);
  Map<String, dynamic> toJson() => _$RecipeToJson(this);
}

@JsonSerializable()
class Macros {
  final double protein;
  final double carbs;
  final double fat;

  Macros({required this.protein, required this.carbs, required this.fat});
  factory Macros.fromJson(Map<String, dynamic> json) => _$MacrosFromJson(json);
  Map<String, dynamic> toJson() => _$MacrosToJson(this);
}


@JsonSerializable()
class ShoppingListItem {
    final String id;
    final String item;
    final String quantity;
    final String? reason;
    final bool checked;
    final DateTime addedAt;

    ShoppingListItem({
        required this.id,
        required this.item,
        required this.quantity,
        this.reason,
        required this.checked,
        required this.addedAt
    });
    factory ShoppingListItem.fromJson(Map<String, dynamic> json) => _$ShoppingListItemFromJson(json);
    Map<String, dynamic> toJson() => _$ShoppingListItemToJson(this);
}

@JsonSerializable()
class HouseholdMember {
    final String userId;
    final String userName;
    
    HouseholdMember({required this.userId, required this.userName});
    factory HouseholdMember.fromJson(Map<String, dynamic> json) => _$HouseholdMemberFromJson(json);
    Map<String, dynamic> toJson() => _$HouseholdMemberToJson(this);
}

@JsonSerializable()
class Household {
    final String id;
    final String inviteCode;
    final String ownerId;
    final String ownerName;
    final List<HouseholdMember> activeMembers;
    final List<HouseholdMember> pendingMembers;

    Household({
        required this.id,
        required this.inviteCode,
        required this.ownerId,
        required this.ownerName,
        required this.activeMembers,
        required this.pendingMembers
    });
    factory Household.fromJson(Map<String, dynamic> json) => _$HouseholdFromJson(json);
    Map<String, dynamic> toJson() => _$HouseholdToJson(this);
}
```

---

## 3. UI/UX Guidelines & Components

-   **Framework:** Use **Flutter** with the **Material 3** design system.
-   **State Management:** Use a modern state management solution like Riverpod or Provider.
-   **Design:** The app should be clean, intuitive, and feel native to the platform. Use `Card` widgets, rounded corners (`borderRadius`), and shadows (`elevation`).
-   **Color Scheme:** The app uses a soft, health-focused color palette. Create a `ThemeData` object with these colors:
    -   `primary`: `#A7D1AB` (a soft green)
    -   `background`: `#F2F4F3`
    -   `secondary` / `accent`: `#EAC4A5` (a light tan/peach for interactive elements)
-   **Iconography**: Use the standard `material-icons` library where possible, mapping from the web app's icons:
    -   `LayoutDashboard` -> `Icons.dashboard`
    -   `Home` -> `Icons.ramen_dining` or `Icons.restaurant_menu`
    -   `Warehouse` -> `Icons.inventory_2`
    -   `ShoppingCart` -> `Icons.shopping_cart`
    -   `BarChart` -> `Icons.bar_chart`
    -   `Bookmark` -> `Icons.bookmark`
    -   `Users` -> `Icons.group`
    -   `Settings` -> `Icons.settings`
    -   `PlusCircle` -> `Icons.add_circle`
    -   `Trash2` -> `Icons.delete`
    -   `Pencil` -> `Icons.edit`

---

## 4. Backend & API Integration

The Flutter app will communicate with the existing backend. Create a dedicated networking service class to handle all API calls using a package like `http` or `dio`.

-   **Authentication**: The app should use the official Firebase Auth for Flutter package (`firebase_auth`) for user sign-up and login. For all subsequent API calls, the user's ID Token must be retrieved via `currentUser.getIdToken()` and sent in the `Authorization` header like this: `Authorization: Bearer <ID_TOKEN>`.
-   **API Base URL**: All API calls should be prefixed with `/api`.

### **Endpoint Definitions:**

**Inventory & Storage:**
- `GET /inventory`: Fetches all private and shared inventory items. Returns `InventoryData`.
- `POST /inventory`: Adds a new inventory item. Body is a new `InventoryItem` (without ID).
- `PUT /inventory/{itemId}`: Updates an existing item.
- `DELETE /inventory/{itemId}`: Removes an item.
- `GET /storage-locations`: Fetches all storage locations.
- `POST /storage-locations`: Adds a new storage location.
- `PUT /storage-locations/{locationId}`: Updates a location.
- `DELETE /storage-locations/{locationId}`: Deletes a location.

**AI & Meal Planning:**
- `POST /ai/meal-suggestions`: Generates meal suggestions.
- `POST /ai/substitutions`: Generates ingredient substitutions.
- `POST /ai/log-meal`: Logs a cooked meal, deducting ingredients.
- `POST /ai/recipe-details`: Fills in nutritional details for a custom recipe.

**Household Management:**
- `GET /household`: Fetches the current user's household details. Returns `Household`.
- `POST /household`: Creates a new household.
- `DELETE /household`: Leaves the current household.
- `POST /household/join`: Joins a household with an invite code.
- `POST /household/approve`: (Owner) Approves a pending member.
- `POST /household/reject`: (Owner) Rejects a pending member.

**Shopping List:**
- `GET /shopping-list`: Fetches all items on the list. Returns `List<ShoppingListItem>`.
- `POST /shopping-list`: Adds an item to the list.
- `PUT /shopping-list/{itemId}`: Updates an item (e.g., toggles `checked` status).
- `DELETE /shopping-list/{itemId}`: Removes a specific item.
- `DELETE /shopping-list`: (No itemId) Removes all *checked* items from the list.

**User Data:**
- `GET /settings`: Fetches user settings.
- `POST /settings`: Saves user settings.
- `GET /saved-recipes`: Fetches the user's bookmarked recipes. Returns `List<Recipe>`.
- `POST /saved-recipes`: Saves a new recipe.

This prompt provides a comprehensive blueprint for creating the Flutter application with high fidelity to the existing web app. Ensure robust error handling for all network requests.