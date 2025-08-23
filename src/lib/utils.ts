
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// A simple ingredient parser. This can be improved with more robust NLP.
export function parseIngredient(ingredient: string) {
    const regex = /^(?<quantity>[\d\s./¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)?\s*(?<unit>tbsp|tsp|cup|cups|oz|g|kg|lb|lbs|ml|l|piece|pieces)?\s*(?<name>.+)$/i;
    const match = ingredient.match(regex);

    if (match && match.groups) {
        let quantity = 0;
        if (match.groups.quantity) {
            const parts = match.groups.quantity.trim().split(/\s+/);
            quantity = parts.reduce((acc, part) => {
                if (part.includes('/')) {
                    const [num, den] = part.split('/').map(Number);
                    return acc + (den ? num / den : 0);
                }
                const specialChars: Record<string, number> = {
                    '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1/3, '⅔': 2/3,
                    '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
                    '⅙': 1/6, '⅚': 5/6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
                };
                return acc + (specialChars[part] || parseFloat(part) || 0);
            }, 0);
        }
        
        return {
            original: ingredient,
            quantity: quantity || 1, // Default to 1 if no quantity found
            unit: match.groups.unit?.trim() || null,
            name: match.groups.name.trim(),
        };
    }
    return { original: ingredient, quantity: 1, unit: null, name: ingredient };
}

function formatFraction(value: number) {
    const fractions: Record<number, string> = {
        0.25: '¼', 0.5: '½', 0.75: '¾',
        [1/3]: '⅓', [2/3]: '⅔',
        0.2: '⅕', 0.4: '⅖', 0.6: '⅗', 0.8: '⅘',
        [1/6]: '⅙', [5/6]: '⅚',
        0.125: '⅛', 0.375: '⅜', 0.625: '⅝', 0.875: '⅞'
    };
    for (const key in fractions) {
        if (Math.abs(value - parseFloat(key)) < 1e-9) {
            return fractions[key];
        }
    }
    return null;
}

function formatQuantity(quantity: number) {
    if (quantity === 0) return "";
    const integerPart = Math.floor(quantity);
    const fractionalPart = quantity - integerPart;
    
    let result = "";
    if (integerPart > 0) {
        result += integerPart;
    }

    const fractionStr = formatFraction(fractionalPart);
    if (fractionStr) {
        if (integerPart > 0) result += " ";
        result += fractionStr;
    } else if (fractionalPart > 0) {
        if (integerPart > 0) result += " ";
        // Format to 2 decimal places and remove trailing zeros
        result += parseFloat(fractionalPart.toFixed(2));
    }

    return result.trim();
}

export function scaleIngredients(ingredients: string[], oldServings: number, newServings: number): string[] {
    const scaleFactor = newServings / oldServings;
    return ingredients.map(ingredient => {
        const parsed = parseIngredient(ingredient);
        if (parsed.quantity) {
            const newQuantity = parsed.quantity * scaleFactor;
            const formattedQuantity = formatQuantity(newQuantity);
            let newIngredientString = "";
            if (formattedQuantity) {
                 newIngredientString += formattedQuantity + " ";
            }
            if (parsed.unit) {
                newIngredientString += parsed.unit + " ";
            }
            newIngredientString += parsed.name;
            return newIngredientString.trim();
        }
        return ingredient; // Return original if it can't be parsed
    });
}
