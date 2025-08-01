const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

// ============================================
// ROTI'S INDIAN RESTAURANT SERVER - VERSION 1.5.3
// Last Updated: July 2025
// Features: Using /get-total items with AI-parsed spice levels/notes from final "Your final order is", default mild spice level for biryanis/entrees, improved appetizer parsing with spice levels, robust contact info extraction, fixed async issue in extractItemsFromTranscript, fixed template literal in Authorization header
// ============================================

const app = express();
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LOG_MODE = process.env.LOG_MODE || 'summary'; // 'full' or 'summary'

// Increased limits for large webhook payloads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Complete menu with all items from Roti's
const MENU_ITEMS = {
  // Soups
  "tomato soup": 7.99,
  "veg hot & sour soup": 8.99,
  "veg hot and sour soup": 8.99,
  "vegetable hot & sour soup": 8.99,
  "vegetable hot and sour soup": 8.99,
  "chicken hot & sour soup": 8.99,
  "chicken hot and sour soup": 8.99,
  
  // Vegetarian Appetizers
  "veg samosas": 7.99,
  "vegetable samosas": 7.99,
  "samosas": 7.99,
  "samosa chaat": 12.99,
  "onion pakora": 7.99,
  "mixed veg pakora": 9.99,
  "mixed vegetable pakora": 9.99,
  "punugulu": 7.99,
  "cut mirchi": 8.99,
  "spl masala mirchi bajji": 9.99,
  "special masala mirchi bajji": 9.99,
  "gobi manchurian": 14.99,
  "gobi 65": 14.99,
  "baby corn manchurian": 14.99,
  "baby corn pepper fry": 14.99,
  "paneer 65": 16.99,
  
  // Non-Vegetarian Appetizers
  "chicken 65": 16.99,
  "chicken majestic": 16.99,
  "chicken manchurian": 16.99,
  "spl chicken pakora": 16.99,
  "special chicken pakora": 16.99,
  "cashew chicken fry": 16.99,
  
  // Vegetarian Entrees
  "dal tadka": 14.99,
  "chana masala": 14.99,
  "chole bhatura": 15.99,
  "mix veg curry": 15.99,
  "mixed vegetable curry": 15.99,
  "aloo gobi masala": 15.99,
  "spinach paneer": 16.99,
  "saag paneer": 16.99,
  "stuffed brinjal curry": 15.99,
  "gutti vankaya curry": 15.99,
  "paneer tikka masala": 16.99,
  "paneer butter masala": 16.99,
  "kadai paneer": 16.99,
  "methi malai mutter": 16.99,
  "egg masala": 16.99,
  
  // Non-Vegetarian Entrees
  "chicken tikka masala": 16.99,
  "kadai chicken": 16.99,
  "butter chicken": 17.99,
  "chicken curry": 16.99,
  "chicken saag": 16.99,
  "chicken spinach": 16.99,
  "spl chicken vindaloo": 16.99,
  "special chicken vindaloo": 16.99,
  "chicken vindaloo": 16.99,
  "lamb curry": 18.99,
  "spl lamb vindaloo": 18.99,
  "special lamb vindaloo": 18.99,
  "lamb vindaloo": 18.99,
  "lamb saag": 18.99,
  "lamb spinach": 18.99,
  "goat curry": 18.99,
  "shrimp curry": 18.99,
  "lamb pepper fry": 19.99,
  "shrimp fry": 18.99,
  
  // Tandoori/Clay Oven Sizzlers
  "paneer tikka kebab": 17.99,
  "chicken tikka kebab": 16.99,
  "chicken malai kebab": 16.99,
  "tandoori chicken half": 16.99,
  "tandoori chicken full": 24.99,
  "tandoori mix grill": 26.99,
  
  // Biryanis
  "veg dum biryani": 14.99,
  "vegetable dum biryani": 14.99,
  "veg keema biryani": 16.49,
  "vegetable keema biryani": 16.49,
  "house spl paneer biryani": 16.99,
  "house special paneer biryani": 16.99,
  "paneer biryani": 16.99,
  "spl egg biryani": 15.99,
  "special egg biryani": 15.99,
  "egg biryani": 15.99,
  "chicken dum biryani": 15.99,
  "chicken biryani": 15.99,
  "chicken 65 biryani": 17.99,
  "goat dum biryani": 19.99,
  "goat biryani": 19.99,
  "lamb biryani": 19.99,
  
  // South Indian Specials
  "idli": 6.99,
  "vada": 7.99,
  "plain dosa": 8.99,
  "podi dosa": 8.99,
  "onion dosa": 9.99,
  "masala dosa": 11.99,
  "mysore masala dosa": 13.99,
  "rava dosa": 13.99,
  "rava onion dosa": 15.99,
  "rava masala dosa": 15.99,
  
  // Desserts
  "gulab jamun": 5.99,
  "rasmalai": 5.99,
  "house spl desert": 5.99,
  "house special dessert": 5.99,
  
  // Beverages
  "coke": 2.49,
  "sprite": 2.49,
  "diet coke": 2.49,
  "thums up": 2.99,
  "limca": 2.99,
  "fanta": 2.99,
  "mango lassi": 5.99,
  
  // Rotis/Naans/Breads
  "tandoori roti": 3.49,
  "butter tandoori roti": 3.99,
  "sharbati roti": 4.49,
  "chilli onion roti": 4.99,
  "garlic roti": 4.99,
  "chilli garlic roti": 5.49,
  "plain naan": 3.49,
  "naan": 3.49,
  "butter naan": 3.99,
  "garlic naan": 4.99,
  "chilli garlic naan": 5.49,
  
  // Sides
  "white rice": 4.99,
  "rice": 4.99,
  "raitha": 2.99,
  "sambar": 2.99
};

// Spice levels for Biryanis and Entrees
const SPICE_LEVELS = ['very mild', 'mild', 'spicy', 'extra spicy'];

// Items that require spice level (only biryanis and entrees)
const SPICE_REQUIRED_ITEMS = [
  'biryani', 'curry', 'masala', 'vindaloo', 'tadka', 'kadai', 
  'saag', 'spinach', 'chana', 'chole', 'aloo gobi', 'methi malai mutter'
];

const TAX_RATE = 0.065;

// Item mappings for common variations (optimized - removed self-mappings)
const ITEM_MAPPINGS = {
  // Soups
  'veg hot sour soup': 'veg hot & sour soup',
  'chicken hot sour soup': 'chicken hot & sour soup',
  
  // Appetizers
  'samosa': 'veg samosas',
  'vegetable samosa': 'veg samosas',
  'mixed pakora': 'mixed veg pakora',
  'veg pakora': 'mixed veg pakora',
  'cauliflower manchurian': 'gobi manchurian',
  'cauliflower 65': 'gobi 65',
  'masala mirchi bajji': 'spl masala mirchi bajji',
  'special masala mirchi bajji': 'spl masala mirchi bajji',
  'special masala mirchi': 'spl masala mirchi bajji',
  'spl masala mirchi': 'spl masala mirchi bajji',
  'chicken sixty-five': 'chicken 65',
  'chicken 65 appetizer': 'chicken 65',
  'chicken 65 with very mild': 'chicken 65',
  'chicken 65 with mild': 'chicken 65',
  'chicken 65 with spicy': 'chicken 65',
  'chicken 65 with extra spicy': 'chicken 65',
  'majestic chicken': 'chicken majestic',
  'chicken majestic with very mild': 'chicken majestic',
  'chicken majestic with mild': 'chicken majestic',
  'chicken majestic with spicy': 'chicken majestic',
  'chicken majestic with extra spicy': 'chicken majestic',
  'chicken manchurian appetizer': 'chicken manchurian',
  'chicken manchurian with very mild': 'chicken manchurian',
  'chicken manchurian with mild': 'chicken manchurian',
  'chicken manchurian with spicy': 'chicken manchurian',
  'chicken manchurian with extra spicy': 'chicken manchurian',
  'special chicken pakora': 'spl chicken pakora',
  'spl pakora': 'spl chicken pakora',
  'chicken pakora': 'spl chicken pakora',
  'spl chicken pakora with very mild': 'spl chicken pakora',
  'spl chicken pakora with mild': 'spl chicken pakora',
  'spl chicken pakora with spicy': 'spl chicken pakora',
  'spl chicken pakora with extra spicy': 'spl chicken pakora',
  'cashew fry': 'cashew chicken fry',
  'chicken cashew fry': 'cashew chicken fry',
  'cashew chicken fry with very mild': 'cashew chicken fry',
  'cashew chicken fry with mild': 'cashew chicken fry',
  'cashew chicken fry with spicy': 'cashew chicken fry',
  'cashew chicken fry with extra spicy': 'cashew chicken fry',
  'paneer 65 with very mild': 'paneer 65',
  'paneer 65 with mild': 'paneer 65',
  'paneer 65 with spicy': 'paneer 65',
  'paneer 65 with extra spicy': 'paneer 65',
  
  // Entrees
  'dal': 'dal tadka',
  'daal tadka': 'dal tadka',
  'chickpea masala': 'chana masala',
  'mixed veg': 'mix veg curry',
  'aloo gobi': 'aloo gobi masala',
  'palak paneer': 'spinach paneer',
  'saag paneer': 'spinach paneer',
  'brinjal curry': 'stuffed brinjal curry',
  'eggplant curry': 'stuffed brinjal curry',
  'stuffed brinjal curry / gutti vankaya curry': 'stuffed brinjal curry',
  'butter paneer': 'paneer butter masala',
  'chicken masala': 'chicken tikka masala',
  'lamb saag': 'lamb spinach',
  'chicken saag': 'chicken spinach',
  'mutton curry': 'goat curry',
  'prawn curry': 'shrimp curry',
  'prawns curry': 'shrimp curry',
  'lamb pepper': 'lamb pepper fry',
  'shrimp stir fry': 'shrimp fry',
  
  // Tandoori
  'paneer kebab': 'paneer tikka kebab',
  'chicken tikka': 'chicken tikka kebab',
  'malai kebab': 'chicken malai kebab',
  'chicken malai': 'chicken malai kebab',
  'tandoori half chicken': 'tandoori chicken half',
  'half tandoori chicken': 'tandoori chicken half',
  'tandoori full chicken': 'tandoori chicken full',
  'full tandoori chicken': 'tandoori chicken full',
  'tandoori grill': 'tandoori mix grill',
  'mix grill': 'tandoori mix grill',
  
  // Biryanis
  'veg biryani': 'veg dum biryani',
  'vegetable biryani': 'veg dum biryani',
  'chicken biryani': 'chicken dum biryani',
  'lamb dum biryani': 'lamb biryani',
  'mutton biryani': 'goat dum biryani',
  
  // Breads
  'roti': 'tandoori roti',
  'plain roti': 'tandoori roti',
  'butter roti': 'butter tandoori roti',
  'garlic butter naan': 'garlic naan',
  
  // Desserts
  'gulab jamoon': 'gulab jamun',
  'ras malai': 'rasmalai',
  'house dessert': 'house spl desert'
};

const QUANTITY_WORDS = { 
  one: 1, two: 2, three: 3, four: 4, five: 5, 
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10 
};

// AI-powered order summarization function
async function summarizeOrderWithAI(orderText) {
  if (!OPENAI_API_KEY) {
    console.log('⚠️ OpenAI API key not configured, using fallback parsing');
    return null;
  }

  try {
    const prompt = `You are an Indian restaurant order parser. Parse ALL items from this order text, which is the final confirmed order by the customer.

CRITICAL PARSING RULES:
1. Extract EVERY SINGLE ITEM with correct quantities
2. "two chicken biryanis both with mild" = quantity: 2, NOT two separate entries
3. Pay attention to quantity words: one=1, two=2, three=3, four=4, five=5
4. "both" means the quantity applies to both/all items (don't create duplicates)
5. For biryanis/entrees, extract spice levels; if none specified, use "mild"
6. For other items (e.g., appetizers), include spice levels if specified, but do not require them
7. Extract any notes or modifications (e.g., "no onions", "extra sauce") in a "notes" field
8. "sixty-five" or "65" in "chicken sixty-five biryani" is part of the dish name
9. Handle phrases like "with mild" or "spicy" correctly for all items

IMPORTANT: Use these EXACT item names (case sensitive):
- "spl masala mirchi bajji" or "special masala mirchi bajji" → "Spl Masala Mirchi Bajji"
- "spinach paneer" or "palak paneer" → "Spinach Paneer" 
- "mixed veg curry" or "mix veg curry" → "Mix Veg Curry"
- "aloo gobi masala" → "Aloo Gobi Masala"
- "chicken tikka masala" → "Chicken Tikka Masala"
- "chicken sixty-five" or "chicken 65" → "Chicken 65"
- "chicken sixty-five biryani" or "chicken 65 biryani" → "Chicken 65 Biryani"
- "goat dum biryani" → "Goat Dum Biryani"
- "mango lassi" → "Mango Lassi"
- "stuffed brinjal curry" → "Stuffed Brinjal Curry"
- "egg masala" → "Egg Masala"
- "butter chicken" → "Butter Chicken"
- "paneer 65" → "Paneer 65"
- "spl chicken pakora" or "special chicken pakora" → "Spl Chicken Pakora"
- "tandoori chicken half" or "half tandoori chicken" → "Tandoori Chicken Half"
- "tandoori chicken full" or "full tandoori chicken" → "Tandoori Chicken Full"
- "tandoori mix grill" or "mix grill" → "Tandoori Mix Grill"
- "chicken majestic" → "Chicken Majestic"
- "chicken manchurian" → "Chicken Manchurian"
- "cashew chicken fry" → "Cashew Chicken Fry"

Order text to parse:
"${orderText}"

IMPORTANT: 
- If order says "two lamb curries", return ONE entry with quantity: 2
- Never create duplicate entries for the same item
- Parse the COMPLETE order text, don't stop early
- Use the exact capitalization shown above
- For biryanis/entrees, if spice level is missing, default to "mild"
- For appetizers, include spice level if specified (e.g., "Chicken 65 with spicy" → item: "Chicken 65", spice_level: "spicy")
- Include a "notes" field for any additional modifications or comments (e.g., "no onions", "extra sauce")

Return JSON array:
[
  {
    "quantity": 2,
    "item": "Chicken 65 Biryani",
    "spice_level": "mild",
    "notes": "no onions"
  },
  {
    "quantity": 1,
    "item": "Chicken 65",
    "spice_level": "spicy",
    "notes": ""
  }
]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response:', data);
      return null;
    }

    const aiResponse = data.choices[0].message.content;
    if (LOG_MODE === 'full') {
      console.log('🤖 Raw AI Response:', aiResponse);
    }
    
    let parsedOrder;
    try {
      parsedOrder = JSON.parse(aiResponse);
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      return null;
    }
    
    if (LOG_MODE === 'full') {
      console.log('🤖 AI Parsed Order:', JSON.stringify(parsedOrder, null, 2));
    }
    return parsedOrder;
  } catch (error) {
    console.error('❌ AI summarization error:', error);
    return null;
  }
}

// Convert AI parsed order to items array
function convertAIParsedToItems(parsedOrder) {
  const items = [];
  
  for (const orderItem of parsedOrder) {
    let itemName = orderItem.item.toLowerCase();
    let quantity = orderItem.quantity || 1;
    let spiceLevel = orderItem.spice_level || (requiresSpiceLevel(orderItem.item) ? 'mild' : null);
    let notes = orderItem.notes || '';
    
    console.log(`\n🔄 Converting AI item: ${orderItem.item}`);
    if (spiceLevel) console.log(`  Spice level: ${spiceLevel}`);
    if (notes) console.log(`  Notes: ${notes}`);
    
    // Find the correct menu item
    let menuItemKey = ITEM_MAPPINGS[itemName] || itemName;
    
    if (MENU_ITEMS[menuItemKey]) {
      const price = MENU_ITEMS[menuItemKey];
      const modifications = [];
      
      // Add spice level if specified, even for non-required items
      if (spiceLevel) {
        modifications.push(`spice: ${spiceLevel}`);
      }
      // Add notes as a modification if present
      if (notes) {
        modifications.push(notes);
      }
      
      addItemToOrder(items, menuItemKey, quantity, price, modifications);
    } else {
      console.log(`  ❌ Menu item not found: ${menuItemKey}`);
    }
  }
  
  return items;
}

// Merge AI-parsed spice levels and notes with /get-total items
function mergeGetTotalWithAIParsed(getTotalItems, aiParsedOrder) {
  const items = [];
  
  // Use get-total items as the base
  for (const getTotalItem of getTotalItems) {
    let itemName = getTotalItem.name.toLowerCase();
    let quantity = getTotalItem.quantity || 1;
    let price = getTotalItem.price;
    let total = getTotalItem.total || price * quantity;
    
    console.log(`\n🔄 Merging get-total item: ${getTotalItem.name}`);
    
    // Find matching AI-parsed item for spice level and notes
    const aiItem = aiParsedOrder.find(ai => {
      const aiItemName = (ITEM_MAPPINGS[ai.item.toLowerCase()] || ai.item.toLowerCase());
      return aiItemName === itemName && ai.quantity === quantity;
    });
    
    const modifications = [];
    
    // Add spice level if found in AI-parsed data or required
    let spiceLevel = aiItem?.spice_level || (requiresSpiceLevel(itemName) ? 'mild' : null);
    if (spiceLevel) {
      modifications.push(`spice: ${spiceLevel}`);
      console.log(`  Spice level: ${spiceLevel}`);
    }
    
    // Add notes if found in AI-parsed data
    let notes = aiItem?.notes || '';
    if (notes) {
      modifications.push(notes);
      console.log(`  Notes: ${notes}`);
    }
    
    addItemToOrder(items, itemName, quantity, price, modifications);
  }
  
  return items;
}

// Check if item requires spice level (only biryanis and entrees)
function requiresSpiceLevel(itemName) {
  const itemLower = itemName.toLowerCase();
  return SPICE_REQUIRED_ITEMS.some(keyword => itemLower.includes(keyword));
}

// Utility functions
function parseQuantity(quantityStr) {
  return QUANTITY_WORDS[quantityStr.toLowerCase()] || parseInt(quantityStr) || 1;
}

function extractSpiceLevel(text) {
  const spiceMatch = text.match(/\b(very mild|mild|medium|spicy|hot|extra spicy|very hot)\b/i);
  if (spiceMatch) {
    const level = spiceMatch[1].toLowerCase();
    // Normalize spice levels
    if (level === 'medium') return 'mild';
    if (level === 'hot') return 'spicy';
    if (level === 'very hot') return 'extra spicy';
    return level;
  }
  return null;
}

function cleanItemText(text) {
  return text
    .replace(/\b(orders?\s+of|pieces?\s+of|order\s+of)\s*/gi, '') // Remove "order of", "orders of", "piece of"
    .replace(/\bwith\s+(very mild|mild|medium|spicy|hot|extra spicy|very hot)\b(?!\s*(&|and)\s*sour)/gi, '') // Remove "with [spice level]"
    .replace(/\b(very mild|mild|medium|spicy|hot|extra spicy|very hot)\b(?!\s*(&|and)\s*sour)/gi, '') // Remove standalone spice levels
    .replace(/\bhot\b(?!\s*(&|and)\s*sour)/gi, '') // Remove "hot" unless part of "hot & sour"
    .replace(/\b(the|of|a|an)\b/gi, ' ') // Remove filler words
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function findMenuItem(itemText) {
  const cleanText = itemText.toLowerCase().trim();
  return ITEM_MAPPINGS[cleanText] || (MENU_ITEMS[cleanText] ? cleanText : null);
}

function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  
  return {
    subtotal: '$' + subtotal.toFixed(2),
    tax: '$' + tax.toFixed(2),
    total: '$' + total.toFixed(2)
  };
}

function extractContactInfo(transcript) {
  let phone = 'N/A';
  let name = 'N/A';
  let address = 'N/A';
  
  // Validate transcript
  if (!Array.isArray(transcript) || transcript.length === 0) {
    console.log('⚠️ Invalid or empty transcript in extractContactInfo');
    return { phone, name, address };
  }
  
  // Find the last AI confirmation message
  let confirmationIndex = -1;
  let confirmationMessage = null;
  
  for (let i = transcript.length - 1; i >= 0; i--) {
    const turn = transcript[i];
    if (turn && turn.role === 'agent' && 
        typeof turn.message === 'string' && 
        /to confirm, your name is\s+(.+?)\s+and your phone number is\s+(.+?)\s*\.\s*is that correct\?/i.test(turn.message)) {
      confirmationIndex = i;
      confirmationMessage = turn.message;
      break;
    }
  }
  
  // Verify customer confirmation and extract details
  if (confirmationIndex !== -1 && confirmationIndex + 1 < transcript.length) {
    const customerResponse = transcript[confirmationIndex + 1];
    if (customerResponse && customerResponse.role === 'user' && 
        typeof customerResponse.message === 'string' && 
        /yes|correct|right|confirm|confirmed|that.?s right|yeah/i.test(customerResponse.message)) {
      if (process.env.LOG_MODE === 'full') {
        console.log('✅ Found last AI confirmation:', confirmationMessage);
        console.log('✅ Customer confirmed:', customerResponse.message);
      }
      
      // Extract name
      const nameMatch = confirmationMessage.match(/your name is\s+([a-zA-Z\s]+?)\s+and your phone number is/i);
      if (nameMatch && nameMatch[1]) {
        name = nameMatch[1].trim();
        if (process.env.LOG_MODE === 'full') {
          console.log('📋 Extracted name:', name);
        }
      }
      
      // Extract phone number
      const phoneMatch = confirmationMessage.match(/your phone number is\s+(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{10})/i);
      if (phoneMatch && phoneMatch[1]) {
        let rawPhone = phoneMatch[1].replace(/[^0-9]/g, '');
        if (rawPhone.length === 10) {
          phone = `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`;
          if (process.env.LOG_MODE === 'full') {
            console.log('📞 Extracted phone:', phone);
          }
        }
      }
    } else if (process.env.LOG_MODE === 'full') {
      console.log('⚠️ Customer confirmation not found or invalid for:', confirmationMessage);
    }
  } else if (process.env.LOG_MODE === 'full') {
    console.log('⚠️ No AI confirmation message found matching "to confirm, your name is ... and your phone number is ..."');
  }
  
  // Extract address from user turns (unchanged from previous versions)
  for (const turn of transcript) {
    if (turn && turn.role === 'user' && typeof turn.message === 'string') {
      const addressMatch = turn.message.match(/(?:address is|live at|deliver to)\s+(.+?)(?:\.|,|$)/i);
      if (addressMatch) {
        address = addressMatch[1].trim();
        if (process.env.LOG_MODE === 'full') {
          console.log('🏠 Extracted address:', address);
        }
      }
    }
  }
  
  return { phone, name, address };
}

function addItemToOrder(items, itemName, quantity, price, modifications = []) {
  const existingItem = items.find(item => 
    item.name === itemName && 
    JSON.stringify(item.modifications || []) === JSON.stringify(modifications)
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.total = existingItem.price * existingItem.quantity;
  } else {
    const newItem = {
      name: itemName,
      quantity: quantity,
      price: price,
      total: price * quantity
    };
    
    if (modifications && modifications.length > 0) {
      newItem.modifications = modifications;
    }
    
    items.push(newItem);
    console.log(`  ✅ Added: ${itemName} x${quantity} @ $${price}`);
  }
}

async function extractItemsFromTranscript(transcript, callId) {
  const items = [];
  
  // Validate transcript
  if (!Array.isArray(transcript) || transcript.length === 0) {
    console.log('⚠️ Invalid or empty transcript in extractItemsFromTranscript');
    return items;
  }
  
  const fullConversation = transcript
    .filter(turn => turn && turn.message && typeof turn.message === 'string')
    .map(t => t.message)
    .join(' ')
    .toLowerCase();
  
  if (LOG_MODE === 'full') {
    console.log('🔍 Full conversation:', fullConversation);
  }
  
  // Find the FINAL order confirmation
  let orderText = '';
  let confirmationIndex = -1;
  const patterns = [
    /your final order is[:\s]*(.+?)(?:\.\s*is that correct|\?\s*is that correct|is that correct)/i,
    /got it[!.]?\s*your final order is[:\s]*(.+?)(?:\.\s*is that correct|\?\s*is that correct|is that correct)/i,
    /here's your order[:\s]*(.+?)(?:\.\s*is that correct|\?\s*is that correct|is that correct)/i,
    /to confirm[,:]\s*(.+?)(?:\.\s*is that correct|\?\s*is that correct|is that correct)/i
  ];
  
  let lastMatchIndex = -1;
  let bestMatch = null;
  
  for (const pattern of patterns) {
    const matches = [...fullConversation.matchAll(new RegExp(pattern.source, 'gi'))];
    for (const match of matches) {
      if (match.index > lastMatchIndex && match[1]) {
        lastMatchIndex = match.index;
        bestMatch = match;
      }
    }
  }
  
  if (bestMatch) {
    orderText = bestMatch[1].trim();
    // Remove any trailing period
    orderText = orderText.replace(/\.\s*$/, '');
    // Find the index of the turn containing the confirmation
    confirmationIndex = transcript.findIndex(turn => 
      turn && turn.role === 'agent' && 
      turn.message && typeof turn.message === 'string' && 
      turn.message.toLowerCase().includes(orderText.toLowerCase())
    );
    if (LOG_MODE === 'full') {
      console.log('✅ Using final order confirmation:', orderText);
      console.log('📍 Confirmation found at turn index:', confirmationIndex);
    }
  }
  
  if (!orderText) {
    if (LOG_MODE === 'full') {
      console.log('🔄 No order confirmation found');
    }
  }
  
  // Verify customer confirmation
  let isCustomerConfirmed = false;
  if (confirmationIndex !== -1 && confirmationIndex + 1 < transcript.length) {
    const customerResponse = transcript[confirmationIndex + 1];
    if (customerResponse && customerResponse.role === 'user' && 
        customerResponse.message && typeof customerResponse.message === 'string' && 
        /yes|correct|right|confirm|confirmed|that.?s right|yeah/i.test(customerResponse.message)) {
      isCustomerConfirmed = true;
      if (LOG_MODE === 'full') {
        console.log('✅ Customer confirmed order:', customerResponse.message);
      }
    }
  }
  
  if (!isCustomerConfirmed && orderText) {
    if (LOG_MODE === 'full') {
      console.log('⚠️ Customer confirmation not found, proceeding with last order confirmation');
    }
  }
  
  // Check if we have a recent /get-total order for this call
  const TIME_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds
  if (latestCompleteOrder && latestCompleteOrder.callId === callId && 
      latestOrderTimestamp && (Date.now() - latestOrderTimestamp < TIME_THRESHOLD)) {
    if (LOG_MODE === 'full') {
      console.log('✅ Using items from /get-total for call:', callId);
      console.log('📦 /get-total items:', JSON.stringify(latestCompleteOrder.items, null, 2));
    }
    
    if (!orderText) {
      // If no order confirmation in transcript, use /get-total items as-is
      return latestCompleteOrder.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        modifications: requiresSpiceLevel(item.name) ? ['spice: mild'] : []
      }));
    }
    
    // Parse spice levels and notes from transcript
    const aiParsedOrder = await summarizeOrderWithAI(orderText);
    
    if (aiParsedOrder && aiParsedOrder.length > 0) {
      if (LOG_MODE === 'full') {
        console.log('🤖 Merging /get-total items with AI-parsed spice levels/notes');
      }
      return mergeGetTotalWithAIParsed(latestCompleteOrder.items, aiParsedOrder);
    } else {
      if (LOG_MODE === 'full') {
        console.log('⚠️ AI parsing failed, using /get-total items with default mild spice for biryanis/entrees');
      }
      // Fallback: Use /get-total items with default spice levels
      return latestCompleteOrder.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        modifications: requiresSpiceLevel(item.name) ? ['spice: mild'] : []
      }));
    }
  }
  
  // Fallback to full AI parsing if no valid /get-total order
  if (LOG_MODE === 'full') {
    console.log('⚠️ No valid /get-total order found, falling back to AI parsing');
  }
  
  if (!orderText) {
    return items;
  }
  
  const aiParsedOrder = await summarizeOrderWithAI(orderText);
  
  if (aiParsedOrder && aiParsedOrder.length > 0) {
    if (LOG_MODE === 'full') {
      console.log('🤖 Using AI-parsed order');
    }
    return convertAIParsedToItems(aiParsedOrder);
  }
  
  if (LOG_MODE === 'full') {
    console.log('⚠️ AI parsing failed, returning empty items');
  }
  return items;
}

// Enhanced extraction with AI
async function extractItemsFromTranscriptWithAI(transcript, callId) {
  if (LOG_MODE === 'full') {
    console.log('🔍 Using AI-enhanced parsing via extractItemsFromTranscript');
  }
  return await extractItemsFromTranscript(transcript, callId);
}

async function extractOrderFromSummary(summary, fallbackTranscript, callId) {
  // Try transcript parsing FIRST (most reliable)
  if (fallbackTranscript && Array.isArray(fallbackTranscript) && fallbackTranscript.length > 0) {
    if (LOG_MODE === 'full') {
      console.log('🎯 Trying transcript parsing first');
    }
    
    const transcriptItems = await extractItemsFromTranscript(fallbackTranscript, callId);
    
    if (transcriptItems && transcriptItems.length > 0) {
      if (LOG_MODE === 'full') {
        console.log('✅ Successfully extracted items');
      }
      
      const contactInfo = extractContactInfo(fallbackTranscript);
      const totals = calculateTotals(transcriptItems);
      
      let pickupTime = 'ASAP';
      let orderType = 'pickup';
      
      if (typeof summary === 'string') {
        const summaryText = summary.toLowerCase();
        const timeMatch = summaryText.match(/(\d+)\s+(minute|min|hour|hr)/i);
        if (timeMatch) {
          pickupTime = timeMatch[1] + ' ' + timeMatch[2] + (timeMatch[1] !== '1' ? 's' : '');
        }
        
        if (/delivery|deliver/.test(summaryText)) {
          orderType = 'delivery';
        }
      }
      
      return {
        customer_name: contactInfo.name || 'N/A',
        phone: contactInfo.phone || 'N/A',
        items: transcriptItems,
        pickup_time: pickupTime,
        order_type: orderType,
        address: contactInfo.address || 'N/A',
        notes: '',
        payment_link: '',
        ...totals
      };
    }
  }
  
  // Final fallback - try to parse from summary if no transcript success
  if (LOG_MODE === 'full') {
    console.log('⚠️ No valid transcript items found, returning null');
  }
  return null;
}

// Add the calculate-order endpoint for ElevenLabs integration
app.post('/calculate-order', async (req, res) => {
  try {
    let data;
    
    // Handle different ways the data might come in
    if (typeof req.body === 'string') {
      data = JSON.parse(req.body);
    } else if (req.body.body && typeof req.body.body === 'string') {
      data = JSON.parse(req.body.body);
    } else {
      data = req.body;
    }
    
    console.log('📱 Price calculation request from ElevenLabs:', JSON.stringify(data, null, 2));
    
    const { items, orderType } = data;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'Invalid request: items array is required' 
      });
    }
    
    let calculatedItems = [];
    let subtotal = 0;
    
    // Process each item
    for (const item of items) {
      let itemName = item.name.toLowerCase();
      let quantity = item.quantity || 1;
      let spiceLevel = item.spice_level || item.spiceLevel;
      
      console.log(`\n🔄 Processing: ${item.name} (qty: ${quantity})`);
      if (spiceLevel) console.log(`  Spice level: ${spiceLevel}`);
      
      // Find the menu item
      let menuItem = findMenuItem(itemName);
      
      if (menuItem && MENU_ITEMS[menuItem]) {
        let price = MENU_ITEMS[menuItem];
        
        console.log(`  Found: ${menuItem} - Price: ${price}`);
        
        // Check if spice level is required but missing
        if (requiresSpiceLevel(menuItem) && !spiceLevel) {
          console.log(`  🌶️ No spice level specified for ${menuItem}, defaulting to mild`);
          spiceLevel = 'mild';
        }
        
        let itemTotal = price * quantity;
        subtotal += itemTotal;
        
        const calcItem = {
          name: menuItem,
          quantity: quantity,
          unitPrice: price,
          total: itemTotal
        };
        
        if (spiceLevel) {
          calcItem.spiceLevel = spiceLevel;
        }
        
        calculatedItems.push(calcItem);
      } else {
        console.log(`  ❌ Could not find menu item: ${itemName}`);
        return res.status(400).json({ 
          error: `Item not found: ${item.name}`,
          suggestion: "Please check the item name and try again"
        });
      }
    }
    
    // Calculate totals
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    const response = {
      items: calculatedItems,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      formattedTotal: `${total.toFixed(2)}`
    };
    
    console.log('💰 Calculated totals:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error calculating order:', error);
    res.status(500).json({ 
      error: 'Failed to calculate order total',
      message: error.message 
    });
  }
});

// Store for capturing the latest order data
let latestCompleteOrder = null;
let latestOrderTimestamp = null;

// Add the get-total endpoint for ElevenLabs live call integration
app.post('/get-total', async (req, res) => {
  try {
    let data;
    
    // Handle different ways the data might come in
    if (typeof req.body === 'string') {
      data = JSON.parse(req.body);
    } else if (req.body.body && typeof req.body.body === 'string') {
      data = JSON.parse(req.body.body);
    } else {
      data = req.body;
    }
    
    console.log('🔢 Live total calculation request:', JSON.stringify(data, null, 2));
    
    const { items } = data;
    const callId = data?.conversation_id || data?.data?.conversation_id;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'Invalid request: items array is required',
        total: "0.00"
      });
    }
    
    let subtotal = 0;
    let itemizedList = [];
    
    // Process each item
    for (const item of items) {
      let itemName = item.name.toLowerCase();
      let quantity = parseInt(item.quantity) || 1;
      
      // Find the menu item
      let menuItem = findMenuItem(itemName);
      
      if (menuItem && MENU_ITEMS[menuItem]) {
        let price = MENU_ITEMS[menuItem];
        let itemTotal = price * quantity;
        subtotal += itemTotal;
        
        itemizedList.push({
          name: menuItem,
          quantity: quantity,
          price: price,
          total: itemTotal
        });
        
        console.log(`  ✓ ${quantity}x ${menuItem} @ ${price} = ${itemTotal.toFixed(2)}`);
      } else {
        console.log(`  ⚠️ Item not found: ${itemName} - skipping`);
      }
    }
    
    // Calculate tax and total
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    console.log(`  Subtotal: ${subtotal.toFixed(2)}`);
    console.log(`  Tax (6.5%): ${tax.toFixed(2)}`);
    console.log(`  Total: ${total.toFixed(2)}`);
    
    // Store this complete order for the post-call webhook
    latestCompleteOrder = {
      callId: callId || null,
      items: itemizedList,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
    latestOrderTimestamp = Date.now();
    
    console.log(`💾 Stored complete order with ${itemizedList.length} items for post-call processing (callId: ${callId || 'none'})`);
    
    // Return simple response for ElevenLabs to speak
    const response = {
      success: true,
      total: total.toFixed(2),
      formattedTotal: `${total.toFixed(2)}`,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      itemCount: itemizedList.length,
      items: itemizedList
    };
    
    console.log('💰 Sending total response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error in get-total:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to calculate total',
      total: "0.00"
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Roti\'s Indian Restaurant Price Calculator v1.5.3',
    timestamp: new Date().toISOString()
  });
});

// Store processed call IDs to prevent duplicates (with size limit)
const processedCalls = new Map();
const MAX_PROCESSED_CALLS = 100;

// Helper function to manage processed calls
function addProcessedCall(callId) {
  if (processedCalls.size >= MAX_PROCESSED_CALLS) {
    // Remove oldest entry
    const firstKey = processedCalls.keys().next().value;
    processedCalls.delete(firstKey);
  }
  processedCalls.set(callId, Date.now());
}

app.post('/post-call', async (req, res) => {
  if (LOG_MODE === 'full') {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Webhook received at:', new Date().toISOString());
    console.log('='.repeat(60));
  }
  
  const data = req.body;
  const transcript = data?.data?.transcript || data?.transcript || [];
  const callId = data?.data?.conversation_id || data?.conversation_id;
  const status = data?.data?.status || data?.status;

  if (LOG_MODE === 'full') {
    console.log('📞 Call ID:', callId);
    console.log('📊 Call Status:', status);
    console.log('📝 Raw transcript:', JSON.stringify(transcript, null, 2));
  }
  
  // Check if we've already processed this call
  if (callId && processedCalls.has(callId)) {
    if (LOG_MODE === 'full') {
      console.log('⏭️ Skipping duplicate webhook for call:', callId);
    }
    return res.status(200).send('✅ Duplicate webhook ignored');
  }
  
  // Mark this call as processed
  if (callId) {
    addProcessedCall(callId);
  }

  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    if (LOG_MODE === 'full') {
      console.log('⚠️ No transcript found in webhook payload');
    }
    return res.status(200).send('✅ Webhook received - No transcript to process');
  }

  // Validate transcript entries
  const validTranscript = transcript.filter(turn => 
    turn && typeof turn === 'object' && turn.role && typeof turn.message === 'string'
  );
  if (validTranscript.length < transcript.length) {
    console.log('⚠️ Found invalid transcript entries:', 
      transcript.filter(turn => !turn || typeof turn !== 'object' || !turn.role || typeof turn.message !== 'string'));
  }

  // In summary mode, only show order confirmation exchanges
  if (LOG_MODE === 'summary') {
    console.log('\n' + '='.repeat(60));
    console.log('📞 Call Summary - ID:', callId);
    console.log('='.repeat(60));
    
    // Find final order confirmation
    let confirmationIndex = -1;
    for (let i = validTranscript.length - 1; i >= 0; i--) {
      if (validTranscript[i].role === 'agent' && 
          typeof validTranscript[i].message === 'string' && 
          /your final order is|got it.*?your final order is|here's your order|to confirm/i.test(validTranscript[i].message)) {
        confirmationIndex = i;
        break;
      }
    }
    
    if (confirmationIndex !== -1) {
      console.log('\n📝 Final Order Confirmation:');
      console.log('Agent:', validTranscript[confirmationIndex].message);
      
      // Look for customer confirmation
      if (confirmationIndex + 1 < validTranscript.length) {
        console.log('Customer:', validTranscript[confirmationIndex + 1].message);
      }
    }
  } else {
    // Full logging mode
    console.log('\n📝 Processing transcript with', validTranscript.length, 'valid turns');
    console.log('-'.repeat(60));
    validTranscript.forEach(turn => {
      console.log((turn.role === 'agent' ? 'Agent' : 'Customer') + ': "' + turn.message + '"');
    });
  }

  let summaryToUse = null;
  if (data?.data?.analysis?.transcript_summary) {
    summaryToUse = data.data.analysis.transcript_summary;
    
    if (LOG_MODE === 'summary') {
      console.log('\n📋 AI Summary:', summaryToUse);
    } else {
      console.log('\n📋 AI-Generated Summary:');
      console.log('-'.repeat(60));
      console.log(summaryToUse);
      console.log('-'.repeat(60));
    }
  }

  if (LOG_MODE === 'full') {
    console.log('\n🔄 Starting order extraction...');
  }
  
  const detectedOrder = await extractOrderFromSummary(summaryToUse, validTranscript, callId);

  if (detectedOrder) {
    if (LOG_MODE === 'summary') {
      console.log('\n📦 Order Detected:');
      console.log('Customer:', detectedOrder.customer_name, '| Phone:', detectedOrder.phone);
      console.log('Type:', detectedOrder.order_type, '| Ready in:', detectedOrder.pickup_time);
      console.log('Items:', detectedOrder.items.length);
      console.log('Total:', detectedOrder.total);
      
      // Show toast payload in compact format
      console.log('\n🍞 Ready for Toast Integration');
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('📦 ORDER DETECTED SUCCESSFULLY');
      console.log('='.repeat(60));
      console.log(JSON.stringify(detectedOrder, null, 2));
      console.log('='.repeat(60));

      // Create sample Toast payload
      const toastPayload = {
        restaurant: "Roti's Indian Restaurant",
        order: detectedOrder,
        timestamp: new Date().toISOString(),
        source: "Voice AI Agent",
        status: "pending_toast_integration"
      };

      console.log('\n🍞 Toast Payload (Ready for future integration):');
      console.log('-'.repeat(60));
      console.log(JSON.stringify(toastPayload, null, 2));
      console.log('-'.repeat(60));
    }
  } else {
    console.log('❌ No order detected.');
  }

  res.status(200).send('✅ Webhook received and processed');
});

app.listen(port, () => {
  console.log('============================================');
  console.log('✅ Roti\'s Indian Restaurant Server v1.5.3 - Started Successfully');
  console.log(`📍 Listening on port ${port}`);
  console.log('🔄 Features: Using /get-total items with AI-parsed spice levels/notes from final "Your final order is", default mild spice level for biryanis/entrees, improved appetizer parsing with spice levels, robust contact info extraction, fixed async issue in extractItemsFromTranscript, fixed template literal in Authorization header');
  console.log('📝 Toast integration ready (awaiting API credentials)');
  console.log('============================================');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});