import { db } from './memoryService.js';

class LifeService {
  // --- TODO LIST METHODS ---
  async addTodo(chatId, task, priority = 'medium') {
    try {
      const colRef = db.collection('users').doc(chatId).collection('todos');
      const docRef = await colRef.add({
        task,
        priority,
        completed: false,
        createdAt: new Date()
      });
      return { success: true, id: docRef.id, task, priority };
    } catch (error) {
      console.error('Error adding todo:', error.message);
      return { success: false, error: error.message };
    }
  }

  async listTodos(chatId) {
    try {
      const colRef = db.collection('users').doc(chatId).collection('todos');
      const snapshot = await colRef.orderBy('createdAt', 'desc').get();
      const todos = [];
      snapshot.forEach(doc => {
        todos.push({ id: doc.id, ...doc.data() });
      });
      return todos;
    } catch (error) {
      console.error('Error listing todos:', error.message);
      return [];
    }
  }

  async completeTodo(chatId, todoId) {
    try {
      const docRef = db.collection('users').doc(chatId).collection('todos').doc(todoId);
      await docRef.update({ completed: true });
      return { success: true };
    } catch (error) {
      console.error('Error completing todo:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteTodo(chatId, todoId) {
    try {
      const docRef = db.collection('users').doc(chatId).collection('todos').doc(todoId);
      await docRef.delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting todo:', error.message);
      return { success: false, error: error.message };
    }
  }

  // --- ISRAELI FINANCIAL CALCULATOR ---
  calculateFinance(amount, type) {
    // Current Israeli VAT rate is 17% (0.17)
    const VAT_RATE = 0.17;
    const usdToIlsRate = 3.65; // Mock rate for convenience

    switch (type.toLowerCase()) {
      case 'add_vat': {
        const vat = amount * VAT_RATE;
        const total = amount + vat;
        return {
          original: amount,
          vat: parseFloat(vat.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          explanation: `₪${amount} + 17% מע"מ (₪${vat.toFixed(2)}) = ₪${total.toFixed(2)}`
        };
      }
      case 'remove_vat': {
        const beforeVat = amount / (1 + VAT_RATE);
        const vat = amount - beforeVat;
        return {
          total: amount,
          vat: parseFloat(vat.toFixed(2)),
          beforeVat: parseFloat(beforeVat.toFixed(2)),
          explanation: `₪${amount} כולל מע"מ מורכב מ-₪${beforeVat.toFixed(2)} לפני מע"מ ו-₪${vat.toFixed(2)} מע"מ`
        };
      }
      case 'usd_to_ils': {
        const result = amount * usdToIlsRate;
        return {
          usd: amount,
          ils: parseFloat(result.toFixed(2)),
          rate: usdToIlsRate,
          explanation: `$${amount} שווה ל-₪${result.toFixed(2)} (לפי שער של ₪${usdToIlsRate})`
        };
      }
      case 'ils_to_usd': {
        const result = amount / usdToIlsRate;
        return {
          ils: amount,
          usd: parseFloat(result.toFixed(2)),
          rate: usdToIlsRate,
          explanation: `₪${amount} שווה ל-$${result.toFixed(2)} (לפי שער של ₪${usdToIlsRate})`
        };
      }
      default:
        return { error: 'Unknown financial calculation type. Use add_vat, remove_vat, usd_to_ils, or ils_to_usd.' };
    }
  }

  // --- PANTRY & RECIPE TRACKER ---
  async updatePantry(chatId, item, quantity) {
    try {
      const docRef = db.collection('users').doc(chatId).collection('pantry').doc(item.toLowerCase().trim());
      if (quantity <= 0) {
        await docRef.delete();
        return { success: true, message: `Removed ${item} from pantry.` };
      } else {
        await docRef.set({
          item: item.trim(),
          quantity,
          updatedAt: new Date()
        });
        return { success: true, item, quantity };
      }
    } catch (error) {
      console.error('Error updating pantry:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getPantry(chatId) {
    try {
      const colRef = db.collection('users').doc(chatId).collection('pantry');
      const snapshot = await colRef.get();
      const pantry = [];
      snapshot.forEach(doc => {
        pantry.push(doc.data());
      });
      return pantry;
    } catch (error) {
      console.error('Error getting pantry:', error.message);
      return [];
    }
  }

  async suggestRecipes(chatId) {
    const pantry = await this.getPantry(chatId);
    const pantryItems = pantry.map(p => p.item.toLowerCase());

    // Simple built-in recipes database
    const recipes = [
      {
        name: 'שקשוקה ביתית (Shakshuka)',
        ingredients: ['tomato', 'egg', 'onion', 'garlic'],
        instructions: 'טגנו בצל ושום, הוסיפו עגבניות ותבלינים, ובסוף שברו פנימה ביצים ובשלו על אש נמוכה.'
      },
      {
        name: 'פסטה רוטב עגבניות (Tomato Pasta)',
        ingredients: ['pasta', 'tomato', 'garlic'],
        instructions: 'בשלו את הפסטה, הכינו רוטב מעגבניות ושום, וערבבו יחד.'
      },
      {
        name: 'חביתה עשירה (Omelette)',
        ingredients: ['egg', 'cheese', 'butter'],
        instructions: 'טרפו ביצים, המיסו חמאה במחבת, שפכו את הביצים והוסיפו גבינה מעל.'
      }
    ];

    const suggestions = recipes.map(recipe => {
      const missing = recipe.ingredients.filter(ing => !pantryItems.includes(ing));
      const matchCount = recipe.ingredients.length - missing.length;
      const matchPercentage = (matchCount / recipe.ingredients.length) * 100;
      return {
        name: recipe.name,
        matchPercentage: Math.round(matchPercentage),
        missingIngredients: missing,
        instructions: recipe.instructions
      };
    });

    // Sort by highest match percentage
    return suggestions.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  // --- SOURDOUGH BAKING LOG ---
  async logSourdough(chatId, stage, durationMinutes, notes = '') {
    try {
      const colRef = db.collection('users').doc(chatId).collection('sourdough');
      const docRef = await colRef.add({
        stage, // 'feeding', 'levain', 'bulk_fermentation', 'bake'
        durationMinutes: parseInt(durationMinutes) || 0,
        notes,
        timestamp: new Date()
      });
      return { success: true, id: docRef.id, stage, durationMinutes, notes };
    } catch (error) {
      console.error('Error logging sourdough:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getSourdoughLog(chatId) {
    try {
      const colRef = db.collection('users').doc(chatId).collection('sourdough');
      const snapshot = await colRef.orderBy('timestamp', 'desc').limit(20).get();
      const logs = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      return logs;
    } catch (error) {
      console.error('Error listing sourdough logs:', error.message);
      return [];
    }
  }
}

export const lifeService = new LifeService();
