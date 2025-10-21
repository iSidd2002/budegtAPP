# 🤖 AI Features Documentation

Your Budget App now includes intelligent AI-powered features using Google Gemini API to enhance expense tracking and provide spending insights.

---

## 🎯 Overview

The AI features are designed to be **lightweight, fast, and optional**. They enhance the user experience without blocking core functionality.

### Features Included

1. **Smart Expense Categorization** - AI suggests the best category based on expense description
2. **Spending Insights** - AI analyzes spending patterns and provides actionable recommendations
3. **Natural Language Processing** - Extract expense details from descriptions

---

## 🚀 Getting Started

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://ai.google.dev/)
2. Click "Get API Key"
3. Create a new API key
4. Copy the key

### 2. Add to Environment

Add to `.env.local`:
```bash
GEMINI_API_KEY=your-api-key-here
```

### 3. Test the Features

Start the app and try:
- Add an expense with a note (e.g., "Bought groceries at Whole Foods")
- Watch AI suggest the category
- View AI insights on the dashboard

---

## 📋 Feature Details

### 1. Smart Expense Categorization

**What it does:**
- When you add a note to an expense, AI analyzes it
- Suggests the most appropriate category (Food, Transport, etc.)
- Shows confidence level (High, Medium, Low)
- Provides reasoning for the suggestion

**How to use:**
1. Enter expense amount
2. Type a description in the "Note" field
3. Wait 800ms for AI to analyze
4. See the suggestion appear
5. Click "Accept" to use it or ignore and select manually

**Example:**
```
Note: "Uber ride to airport"
↓
AI Suggestion: Transport (High confidence)
Reasoning: "Uber is a transportation service"
```

**API Endpoint:**
```bash
POST /api/ai/suggest-category
Content-Type: application/json

{
  "description": "Bought groceries at Whole Foods",
  "amount": 1250.50
}

Response:
{
  "category": "Food",
  "confidence": "high",
  "reasoning": "Whole Foods is a grocery store"
}
```

### 2. Spending Insights

**What it does:**
- Analyzes your spending patterns
- Identifies highest spending categories
- Compares current vs previous spending
- Provides actionable recommendations
- Shows on dashboard automatically

**How to use:**
1. Go to Dashboard
2. Scroll down to "AI Insights" section
3. Read personalized insights
4. Act on recommendations

**Example Insights:**
- 📊 "Your highest spending category is Food (₹15,000). This is 30% of your budget."
- 📈 "You're on track to stay within budget this month."
- 💡 "Consider reducing Entertainment spending by ₹2,000 to save more."

**API Endpoint:**
```bash
GET /api/ai/insights?month=10&year=2025
Authorization: Bearer <token>

Response:
{
  "insights": [
    {
      "type": "highest_category",
      "title": "Top Spending Category",
      "description": "Food is your highest spending category at ₹15,000",
      "actionable": true
    },
    {
      "type": "recommendation",
      "title": "Budget Optimization",
      "description": "Consider reducing Entertainment by ₹2,000",
      "actionable": true
    }
  ],
  "summary": {
    "budget": 50000,
    "spent": 25000,
    "remaining": 25000,
    "percentage": "50.0",
    "expenseCount": 12
  }
}
```

### 3. Natural Language Extraction

**What it does:**
- Extracts amount, category, and description from natural language
- Useful for voice input or quick entry
- Currently used internally, can be extended

**Example:**
```
Input: "I spent 500 on groceries today"
↓
Extracted:
{
  "amount": 500,
  "category": "Food",
  "description": "groceries"
}
```

---

## ⚙️ Configuration

### API Key Management

**Development:**
```bash
# .env.local
GEMINI_API_KEY=your-api-key-here
```

**Production (Vercel):**
1. Go to Vercel Dashboard
2. Project Settings → Environment Variables
3. Add `GEMINI_API_KEY`
4. Redeploy

### Rate Limiting

The AI features have built-in safeguards:
- **Timeout:** 3 seconds for category suggestions, 5 seconds for insights
- **Graceful Degradation:** If AI fails, app continues normally
- **Free Tier:** Uses Gemini 1.5 Flash (free tier)

### Performance

- **Category Suggestion:** ~500-1000ms
- **Spending Insights:** ~1-2 seconds
- **Debouncing:** 800ms delay on note input to avoid excessive API calls

---

## 🔒 Security & Privacy

### Data Handling

- ✅ Only descriptions and amounts sent to Gemini
- ✅ No personal information stored
- ✅ No data retention by Google
- ✅ HTTPS encryption for all API calls
- ✅ API key never exposed to frontend

### Error Handling

- ✅ Graceful degradation if API fails
- ✅ No blocking of core functionality
- ✅ User-friendly error messages
- ✅ Automatic fallbacks

---

## 🧪 Testing

### Manual Testing

```bash
# 1. Start the app
npm run dev

# 2. Login with test credentials
# test@example.com / password123

# 3. Test category suggestion
# - Go to Add Expense
# - Enter amount: 500
# - Enter note: "Bought groceries at Whole Foods"
# - Wait for AI suggestion
# - Click Accept

# 4. Test spending insights
# - Go to Dashboard
# - Scroll to "AI Insights" section
# - See personalized insights
```

### API Testing

```bash
# Test category suggestion
curl -X POST http://localhost:3000/api/ai/suggest-category \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Uber ride to airport",
    "amount": 500
  }'

# Test spending insights
curl -X GET "http://localhost:3000/api/ai/insights?month=10&year=2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Usage Examples

### Example 1: Quick Expense Entry

```
User enters: "Starbucks coffee ₹250"
↓
AI suggests: Coffee → Food category
↓
User clicks Accept
↓
Expense added with correct category
```

### Example 2: Budget Analysis

```
Dashboard shows:
- Budget: ₹50,000
- Spent: ₹35,000 (70%)
- Remaining: ₹15,000

AI Insights:
1. "Your highest spending is Food (₹15,000)"
2. "You're on track to stay within budget"
3. "Consider reducing Entertainment by ₹2,000"
```

### Example 3: Recurring Expenses

```
User adds: "Netflix subscription ₹499"
↓
AI suggests: Entertainment
↓
User marks as recurring (Monthly)
↓
Automatically added every month
```

---

## 🐛 Troubleshooting

### AI Suggestions Not Appearing

**Problem:** No AI suggestion after typing note
**Solutions:**
1. Check GEMINI_API_KEY is set in .env.local
2. Verify API key is valid
3. Check browser console for errors
4. Ensure note is at least 4 characters
5. Wait 800ms after typing

### Suggestions Are Inaccurate

**Problem:** AI suggests wrong category
**Solutions:**
1. Be more specific in the note (e.g., "Uber ride" instead of "ride")
2. Include the merchant name (e.g., "Whole Foods" instead of "groceries")
3. AI learns from patterns - more data = better suggestions

### API Errors

**Problem:** "Error processing request"
**Solutions:**
1. Check API key is correct
2. Verify API key has Generative Language API enabled
3. Check rate limits (free tier: 60 requests/minute)
4. Check internet connection

### Insights Not Loading

**Problem:** "Could not load AI insights"
**Solutions:**
1. Ensure you have expenses this month
2. Ensure budget is set
3. Check authentication token
4. Verify API key is valid

---

## 📈 Future Enhancements

Potential AI features to add:

1. **Spending Forecasting** - Predict next month's spending
2. **Budget Recommendations** - AI suggests optimal budget based on history
3. **Anomaly Detection** - Alert on unusual spending
4. **Voice Input** - "I spent 500 on groceries"
5. **Receipt Scanning** - Extract details from receipt photos
6. **Savings Goals** - AI helps set and track savings goals
7. **Expense Optimization** - Find ways to reduce spending

---

## 💡 Tips & Best Practices

### For Best Results

1. **Be Descriptive:** "Whole Foods groceries" → Better than "groceries"
2. **Include Merchant:** "Uber ride" → Better than "ride"
3. **Add Context:** "Netflix monthly subscription" → Better than "Netflix"
4. **Consistent Naming:** Use same names for recurring expenses

### Performance Tips

1. **Debouncing:** AI waits 800ms after you stop typing
2. **Timeout:** If AI takes >3 seconds, it times out gracefully
3. **Caching:** Insights are fetched once per dashboard load
4. **Offline:** App works without AI (graceful degradation)

---

## 📞 Support

### Resources

- **Google Gemini Docs:** https://ai.google.dev/docs
- **API Reference:** https://ai.google.dev/api
- **Free Tier Limits:** https://ai.google.dev/pricing

### Getting Help

1. Check browser console for errors
2. Review API response in Network tab
3. Verify API key is correct
4. Check .env.local file
5. Restart development server

---

## 🔄 API Reference

### POST /api/ai/suggest-category

Suggests expense category based on description.

**Request:**
```json
{
  "description": "Whole Foods groceries",
  "amount": 1250.50
}
```

**Response:**
```json
{
  "category": "Food",
  "confidence": "high",
  "reasoning": "Whole Foods is a grocery store"
}
```

**Status Codes:**
- 200: Success (or graceful failure)
- 400: Invalid input
- 401: Unauthorized

---

### GET /api/ai/insights

Generates spending insights for a specific month.

**Query Parameters:**
- `month` (optional): Month number (1-12), default: current month
- `year` (optional): Year, default: current year

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "insights": [
    {
      "type": "highest_category",
      "title": "Top Spending Category",
      "description": "Food is your highest spending...",
      "actionable": true
    }
  ],
  "summary": {
    "budget": 50000,
    "spent": 25000,
    "remaining": 25000,
    "percentage": "50.0",
    "expenseCount": 12
  }
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 500: Server error (returns empty insights)

---

## 📝 Version History

### v1.0.0 (Current)
- ✅ Smart expense categorization
- ✅ Spending insights
- ✅ Natural language extraction
- ✅ Graceful error handling
- ✅ Production-ready

---

**Last Updated:** October 21, 2025
**Status:** Production Ready
**API:** Google Gemini 1.5 Flash

