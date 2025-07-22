const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

// ============================================
// ROTI'S INDIAN RESTAURANT SERVER - VERSION 1.0
// Last Updated: January 2025
// Features: Spice level handling, AI order parsing, simplified without Toast
// ============================================

const app = express();
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

// Items that require spice level
const SPICE_REQUIRED_ITEMS = [
  'biryani', 'curry', 'masala', 'vindaloo', 'tadka', 'kadai', 
  'tikka', 'saag', 'spinach', 'chana', 'chole', 'aloo gobi',
  'paneer', 'chicken', 'lamb', 'goat', 'shrimp', 'egg masala'
];

const TAX_RATE = 0.065;

// Item mappings for common variations
const ITEM_MAPPINGS = {
  // Soups
  'tomato soup': 'tomato soup',
  'veg hot sour soup': 'veg hot & sour soup',
  'chicken hot sour soup': 'chicken hot & sour soup',
  
  // Appetizers
  'samosa': 'veg samosas',
  'vegetable samosa': 'veg samosas',
  'mixed pakora': 'mixed veg pakora',
  'veg pakora': 'mixed veg pakora',
  'cauliflower manchurian': 'gobi manchurian',
  'cauliflower 65': 'gobi 65',
  
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
  'butter paneer': 'paneer butter masala',
  'chicken masala': 'chicken tikka masala',
  'lamb saag': 'lamb spinach',
  'chicken saag': 'chicken spinach',
  'mutton curry': 'goat curry',
  'prawn curry': 'shrimp curry',
  'prawns curry': 'shrimp curry',
  
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
    const prompt = `You are an Indian restaurant order parser. Parse ALL items from this order text.

CRITICAL PARSING RULES:
1. Extract EVERY SINGLE ITEM with correct quantities
2. "two chicken biryanis both with mild" = quantity: 2, NOT two separate entries
3. Pay attention to quantity words: one=1, two=2, three=3, four=4, five=5
4. "both" means the quantity applies to both/all items (don't create duplicates)
5. For biryanis/entrees, extract spice levels
6. "sixty-five" or "65" in "chicken sixty-five biryani" is part of the dish name

Common items:
- "spinach paneer" = "Spinach Paneer" 
- "mixed veg curry" = "Mix Veg Curry"
- "aloo gobi masala" = "Aloo Gobi Masala"
- "chicken tikka kebab" = "Chicken Tikka Kebab"
- "chicken sixty-five biryani" = "Chicken 65 Biryani"
- "goat dum biryani" = "Goat Dum Biryani"
- "mango lassi" = "Mango Lassi"

Order text to parse:
"${orderText}"

IMPORTANT: 
- If order says "two lamb curries", return ONE entry with quantity: 2
- Never create duplicate entries for the same item
- Parse the COMPLETE order text, don't stop early

Return JSON array:
[
  {
    "quantity": 2,
    "item": "Chicken 65 Biryani",
    "spice_level": "spicy"
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
    console.log('🤖 Raw AI Response:', aiResponse);
    
    const parsedOrder = JSON.parse(aiResponse);
    
    console.log('🤖 AI Parsed Order:', JSON.stringify(parsedOrder, null, 2));
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
    let spiceLevel = orderItem.spice_level;
    
    console.log(`\n🔄 Converting AI item: ${orderItem.item}`);
    if (spiceLevel) console.log(`  Spice level: ${spiceLevel}`);
    
    // Find the correct menu item
    let menuItemKey = ITEM_MAPPINGS[itemName] || itemName;
    
    if (MENU_ITEMS[menuItemKey]) {
      const price = MENU_ITEMS[menuItemKey];
      const modifications = [];
      
      // Add spice level if applicable and not MISSING_SPICE
      if (spiceLevel && spiceLevel !== 'MISSING_SPICE' && requiresSpiceLevel(menuItemKey)) {
        modifications.push(`spice: ${spiceLevel}`);
      }
      
      addItemToOrder(items, menuItemKey, quantity, price, modifications);
    } else {
      console.log(`  ❌ Menu item not found: ${menuItemKey}`);
    }
  }
  
  return items;
}

// Check if item requires spice level
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
    .replace(/\b(orders?\s+of|pieces?\s+of)\s*/gi, '')
    // Only remove spice levels, not "hot" when it's part of "hot & sour" or "hot and sour"
    .replace(/\b(very mild|mild|medium|spicy|extra spicy|very hot)\b(?!\s*(&|and)\s*sour)/gi, '')
    // Don't remove "hot" if followed by "&" or "and"
    .replace(/\bhot\b(?!\s*(&|and)\s*sour)/gi, '')
    .replace(/\b(the|of|a|an)\b/gi, ' ')
    .replace(/\s+/g, ' ')
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
  
  for (const turn of transcript) {
    if (turn.role === 'user') {
      // Phone number extraction (common Tampa/St. Pete area codes)
      const phoneMatch = turn.message.match(/\b(813|727|941|352)[-.\s]?(\d{3})[-.\s]?(\d{4})\b/);
      if (phoneMatch) {
        phone = phoneMatch[1] + '-' + phoneMatch[2] + '-' + phoneMatch[3];
      }
      
      // Name extraction
      const namePatterns = [
        /my name is\s+([a-zA-Z]+)(?:\s+and|\s+phone|\.|$)/i,
        /i'm\s+([a-zA-Z]+)(?:\s+and|\s+phone|\.|$)/i,
        /this is\s+([a-zA-Z]+)(?:\s+and|\s+phone|\.|$)/i,
        /name is\s+([a-zA-Z]+)(?:\s+and|\s+phone|\.|$)/i
      ];
      
      for (const pattern of namePatterns) {
        const match = turn.message.match(pattern);
        if (match && match[1]) {
          name = match[1].trim();
          break;
        }
      }
      
      // Address extraction for delivery
      const addressMatch = turn.message.match(/(?:address is|live at|deliver to)\s+(.+?)(?:\.|,|$)/i);
      if (addressMatch) address = addressMatch[1].trim();
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

function extractItemsFromTranscript(transcript) {
  const items = [];
  const fullConversation = transcript.map(t => t.message).join(' ').toLowerCase();
  
  console.log('🔍 Full conversation:', fullConversation);
  
  // Find order confirmation
  let orderText = '';
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
    // Remove any trailing period that might be before "is that correct?"
    orderText = orderText.replace(/\.\s*$/, '');
    console.log('✅ Using order confirmation:', orderText);
  }
  
  if (!orderText) {
    console.log('🔄 No order confirmation found');
    return items;
  }
  
  // Split order into segments
  let segments = [];
  const parts = orderText.split(/[,;]|and\s+(?=\d|one|two|three)/i);
  
  for (const part of parts) {
    const trimmed = part.trim().replace(/^and\s+/i, '');
    if (trimmed.length > 2) {
      segments.push(trimmed);
    }
  }
  
  console.log('📝 Order segments:', segments);
  
  // Process each segment
  for (const segment of segments) {
    console.log('\n🔄 Processing:', segment);
    
    let quantity = 1;
    let itemText = segment;
    let spiceLevel = null;
    
    // Extract quantity
    const qtyMatch = segment.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(.+)/i);
    if (qtyMatch) {
      quantity = parseQuantity(qtyMatch[1]);
      itemText = qtyMatch[2].trim();
    }
    
    // Extract spice level
    spiceLevel = extractSpiceLevel(segment);
    if (spiceLevel) {
      console.log('🌶️ Spice level:', spiceLevel);
    }
    
    // Clean item text
    const cleanedText = cleanItemText(itemText);
    console.log('🧹 Cleaned:', cleanedText);
    
    // Find menu item
    const menuItem = findMenuItem(cleanedText);
    console.log('🎯 Found:', menuItem);
    
    if (menuItem && MENU_ITEMS[menuItem]) {
      const price = MENU_ITEMS[menuItem];
      const modifications = [];
      
      // Add spice level if required
      if (spiceLevel && requiresSpiceLevel(menuItem)) {
        modifications.push(`spice: ${spiceLevel}`);
      }
      
      addItemToOrder(items, menuItem, quantity, price, modifications);
    } else {
      console.log('❌ Could not match:', cleanedText);
    }
  }
  
  return items;
}

// Enhanced extraction with AI
async function extractItemsFromTranscriptWithAI(transcript) {
  const fullConversation = transcript.map(t => t.message).join(' ').toLowerCase();
  
  console.log('🔍 Looking for "Your final order is" in conversation...');
  
  const regex = /your final order is[:\s]+(.+?)(?:\.\s*is that correct|\?\s*is that correct|is that correct)/gis;
  const matches = [...fullConversation.matchAll(regex)];
  
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    let orderText = lastMatch[1].trim();
    
    orderText = orderText.replace(/\.\s*$/, '');
    
    console.log(`✅ Found ${matches.length} order confirmation(s), using the LAST one`);
    console.log('📍 Order text:', orderText);
    
    // Try AI parsing first
    const aiParsedOrder = await summarizeOrderWithAI(orderText);
    
    if (aiParsedOrder && aiParsedOrder.length > 0) {
      console.log('🤖 Using AI-parsed order');
      return convertAIParsedToItems(aiParsedOrder);
    }
  }
  
  console.log('🔄 Falling back to regex parsing');
  return null;
}

async function extractOrderFromSummary(summary, fallbackTranscript) {
  // Try AI parsing first
  if (fallbackTranscript && fallbackTranscript.length > 0) {
    console.log('🎯 Trying AI-enhanced transcript parsing');
    const aiItems = await extractItemsFromTranscriptWithAI(fallbackTranscript);
    
    if (aiItems && aiItems.length > 0) {
      console.log('✅ Successfully extracted items using AI');
      
      const contactInfo = extractContactInfo(fallbackTranscript);
      const totals = calculateTotals(aiItems);
      
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
        items: aiItems,
        pickup_time: pickupTime,
        order_type: orderType,
        address: contactInfo.address || 'N/A',
        notes: '',
        payment_link: '',
        ...totals
      };
    }
  }
  
  // Fallback to original regex parsing
  console.log('🔄 Falling back to regex parsing');
  if (fallbackTranscript && fallbackTranscript.length > 0) {
    const transcriptItems = extractItemsFromTranscript(fallbackTranscript);
    
    if (transcriptItems && transcriptItems.length > 0) {
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
    let missingSpiceItems = [];
    
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
          missingSpiceItems.push(menuItem);
          console.log(`  ⚠️ Missing required spice level for: ${menuItem}`);
        }
        
        let itemTotal = price * quantity;
        subtotal += itemTotal;
        
        const calcItem = {
          name: menuItem,
          quantity: quantity,
          unitPrice: price,
          total: itemTotal
        };
        
        if (spiceLevel && requiresSpiceLevel(menuItem)) {
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
    
    // Check for missing spice levels
    if (missingSpiceItems.length > 0) {
      return res.status(400).json({
        error: 'Missing spice levels',
        message: `Please specify spice level (very mild, mild, spicy, or extra spicy) for: ${missingSpiceItems.join(', ')}`,
        missingSpiceItems: missingSpiceItems
      });
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
    service: 'Roti\'s Indian Restaurant Price Calculator v1.0',
    timestamp: new Date().toISOString()
  });
});

// Store processed call IDs to prevent duplicates
const processedCalls = new Set();

app.post('/post-call', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Webhook received at:', new Date().toISOString());
  console.log('='.repeat(60));
  
  const data = req.body;
  const transcript = data?.data?.transcript || data?.transcript || [];
  const callId = data?.data?.conversation_id || data?.conversation_id;
  const status = data?.data?.status || data?.status;

  console.log('📞 Call ID:', callId);
  console.log('📊 Call Status:', status);
  
  // Check if we've already processed this call
  if (callId && processedCalls.has(callId)) {
    console.log('⏭️ Skipping duplicate webhook for call:', callId);
    return res.status(200).send('✅ Duplicate webhook ignored');
  }
  
  // Mark this call as processed
  if (callId) {
    processedCalls.add(callId);
    // Clean up old entries after 5 minutes to prevent memory bloat
    setTimeout(() => processedCalls.delete(callId), 5 * 60 * 1000);
  }

  if (!transcript || transcript.length === 0) {
    console.log('⚠️ No transcript found in webhook payload');
    return res.status(200).send('✅ Webhook received - No transcript to process');
  }

  // Process the transcript
  console.log('\n📝 Processing transcript with', transcript.length, 'turns');
  console.log('-'.repeat(60));
  transcript.forEach(turn => {
    if (turn.role && turn.message) {
      console.log((turn.role === 'agent' ? 'Agent' : 'Customer') + ': "' + turn.message + '"');
    }
  });

  // Process the transcript
  console.log('📝 Processing transcript with', transcript.length, 'turns');
  transcript.forEach(turn => {
    if (turn.role && turn.message) {
      console.log((turn.role === 'agent' ? 'Agent' : 'Customer') + ': "' + turn.message + '"');
    }
  });

  let summaryToUse = null;
  if (data?.data?.analysis?.transcript_summary) {
    console.log('\n📋 AI-Generated Summary:');
    console.log('-'.repeat(60));
    console.log(data.data.analysis.transcript_summary);
    console.log('-'.repeat(60));
    summaryToUse = data.data.analysis.transcript_summary;
  }

  console.log('\n🔄 Starting order extraction...');
  const detectedOrder = await extractOrderFromSummary(summaryToUse, transcript);

  if (detectedOrder) {
    console.log('\n' + '='.repeat(60));
    console.log('📦 ORDER DETECTED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(JSON.stringify(detectedOrder, null, 2));
    console.log('='.repeat(60));

    // Create sample Toast payload (for when you get the API details)
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
    
    // TODO: When you get Toast API details, uncomment this:
    /*
    try {
      const response = await fetch(TOAST_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + TOAST_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toastPayload)
      });

      const result = await response.json();
      console.log('✅ Toast API Response:', result);
    } catch (err) {
      console.error('❌ Error sending order to Toast:', err.message);
    }
    */
    
  } else {
    console.log('❌ No order detected.');
  }

  res.status(200).send('✅ Webhook received and processed');
});

app.listen(port, () => {
  console.log('============================================');
  console.log('✅ Roti\'s Indian Restaurant Server v1.0 - Started Successfully');
  console.log(`📍 Listening on port ${port}`);
  console.log('🔄 Features: AI order parsing, spice level validation');
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