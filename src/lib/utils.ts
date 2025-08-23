
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { subDays, startOfDay, endOfDay } from "date-fns";

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

export function getUserDayBoundaries(date: Date, dayStartTime: string): { start: Date, end: Date } {
    const [startHours, startMinutes] = dayStartTime.split(':').map(Number);
    
    let userDayStart = new Date(date);
    userDayStart.setHours(startHours, startMinutes, 0, 0);

    // If the check date is *before* today's start time, the user's day belongs to the previous calendar day.
    if (date < userDayStart) {
        userDayStart = subDays(userDayStart, 1);
    }
    
    const userDayEnd = new Date(userDayStart);
    userDayEnd.setDate(userDayEnd.getDate() + 1);
    userDayEnd.setSeconds(userDayEnd.getSeconds() - 1);

    return { start: userDayStart, end: userDayEnd };
}

/**
 * Checks if a given date falls within the user's current custom "day".
 * @param date The date to check.
 * @param dayStartTime The start time of the user's day in "HH:mm" format.
 * @returns True if the date is within the user's current day.
 */
export function isWithinUserDay(date: Date, dayStartTime: string): boolean {
    const { start, end } = getUserDayBoundaries(new Date(), dayStartTime);
    return date >= start && date <= end;
}


/**
 * Determines which calendar date a meal should be logged against, based on the user's custom day start time.
 * For example, a meal logged at 2 AM on Tuesday might belong to "Monday's user day".
 * @param date The timestamp of the meal.
 * @param dayStartTime The start time of the user's day in "HH:mm" format.
 * @returns The Date object representing the calendar day the meal belongs to.
 */
export function getUserDay(date: Date, dayStartTime: string): Date {
     const { start } = getUserDayBoundaries(date, dayStartTime);
     return startOfDay(start);
}
