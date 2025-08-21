
'use server';
import { generateSuggestions } from './suggestion-flow';
import { generateSubstitutions } from './substitution-flow';
import { generateRecipeDetails } from './recipe-details-flow';
import { logCookedMeal } from './log-meal-flow';
import { generateShoppingList } from './shopping-list-flow';

export { 
    generateSuggestions,
    generateSubstitutions,
    generateRecipeDetails,
    logCookedMeal,
    generateShoppingList
};
