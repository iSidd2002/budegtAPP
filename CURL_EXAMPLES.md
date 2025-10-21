# cURL Examples

This document provides 5 complete cURL examples for testing the Budget App API.

## Setup

Before running these examples, start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Example 1: Sign Up

Create a new user account.

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }' \
  -c cookies.txt
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notes:**
- Password must be at least 8 characters
- Email must be valid and unique
- Access token is valid for 15 minutes
- Refresh token is stored in HTTP-only cookie

---

## Example 2: Login

Authenticate with existing credentials.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }' \
  -c cookies.txt
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notes:**
- Credentials must be correct
- Failed attempts trigger rate limiting (10 per 15 minutes)
- 5 failed attempts trigger 15-minute account lockout
- Save the access token for subsequent requests

---

## Example 3: Create Expense

Add a new expense to the current month.

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "amount": 45.50,
    "category": "Food",
    "date": "2024-01-15T10:30:00Z",
    "note": "Grocery shopping at Whole Foods",
    "isRecurring": false
  }'
```

**Response:**
```json
{
  "success": true,
  "expense": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "amount": 45.50,
    "category": "Food",
    "date": "2024-01-15T10:30:00.000Z",
    "note": "Grocery shopping at Whole Foods",
    "isRecurring": false,
    "recurringFrequency": null,
    "recurringEndDate": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Notes:**
- Replace `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with your actual access token
- Amount must be positive
- Category can be: Food, Transport, Utilities, Entertainment, Healthcare, Shopping, Other
- Date must be in ISO 8601 format
- Note is optional and limited to 500 characters
- Rate limit: 100 requests per minute per user

---

## Example 4: Set Budget and Get Summary

Set a monthly budget and retrieve budget summary with expenses.

```bash
# First, set the budget
curl -X POST http://localhost:3000/api/budget \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "amount": 2000,
    "month": 1,
    "year": 2024
  }'

# Then, get the budget summary
curl -X GET "http://localhost:3000/api/budget?month=1&year=2024" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (GET):**
```json
{
  "success": true,
  "budget": {
    "id": "507f1f77bcf86cd799439013",
    "userId": "507f1f77bcf86cd799439011",
    "amount": 2000,
    "month": 1,
    "year": 2024,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "summary": {
    "month": 1,
    "year": 2024,
    "totalSpent": 45.50,
    "budgetAmount": 2000,
    "remaining": 1954.50,
    "expenseCount": 1
  },
  "categoryBreakdown": {
    "Food": 45.50
  },
  "expenses": [
    {
      "id": "507f1f77bcf86cd799439012",
      "amount": 45.50,
      "category": "Food",
      "date": "2024-01-15T10:30:00.000Z",
      "note": "Grocery shopping at Whole Foods"
    }
  ]
}
```

**Notes:**
- Month must be 1-12
- Year must be 2000 or later
- Budget is created or updated if it already exists
- Summary shows remaining budget and category breakdown

---

## Example 5: Export Data as CSV

Export all expenses as CSV file.

```bash
curl -X GET "http://localhost:3000/api/analytics/export?format=csv" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -o expenses.csv
```

**Response (CSV):**
```csv
Date,Category,Amount,Note,Recurring
2024-01-15,Food,45.5,Grocery shopping at Whole Foods,No
```

**Alternative: Export as JSON**

```bash
curl -X GET "http://localhost:3000/api/analytics/export?format=json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (JSON):**
```json
{
  "success": true,
  "exportDate": "2024-01-15T10:30:00.000Z",
  "expenses": [
    {
      "id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "amount": 45.50,
      "category": "Food",
      "date": "2024-01-15T10:30:00.000Z",
      "note": "Grocery shopping at Whole Foods",
      "isRecurring": false,
      "recurringFrequency": null,
      "recurringEndDate": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Notes:**
- Format can be `csv` or `json`
- Optional query parameters:
  - `startDate`: Filter expenses from this date (ISO 8601)
  - `endDate`: Filter expenses until this date (ISO 8601)
- CSV file is automatically downloaded with timestamp in filename

---

## Additional Examples

### Get Expenses with Filtering

```bash
curl -X GET "http://localhost:3000/api/expenses?category=Food&limit=10&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Update Expense

```bash
curl -X PUT http://localhost:3000/api/expenses/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "amount": 50.00,
    "note": "Updated note"
  }'
```

### Delete Expense

```bash
curl -X DELETE http://localhost:3000/api/expenses/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

## Error Handling

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
**Solution**: Provide valid access token in Authorization header

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 8,
      "type": "string",
      "path": ["password"],
      "message": "String must contain at least 8 character(s)"
    }
  ]
}
```
**Solution**: Check request body matches schema requirements

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded"
}
```
**Solution**: Wait before making more requests. Check `Retry-After` header.

### 404 Not Found
```json
{
  "error": "Expense not found or unauthorized"
}
```
**Solution**: Verify expense ID exists and belongs to authenticated user

---

## Tips

1. **Save Access Token**: Store the token from login response for subsequent requests
2. **Use -c flag**: Save cookies with `curl -c cookies.txt` for session management
3. **Use -b flag**: Load cookies with `curl -b cookies.txt` for refresh token
4. **Pretty Print JSON**: Pipe to `jq`: `curl ... | jq`
5. **Save Response**: Use `-o filename` to save response to file
6. **Verbose Mode**: Use `-v` flag to see request/response headers
7. **Test Rate Limiting**: Make multiple requests quickly to test rate limits
8. **Test Validation**: Send invalid data to test input validation

---

## Bash Script for Testing

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
EMAIL="test@example.com"
PASSWORD="TestPassword123"

echo "🧪 Testing Budget App API"

# 1. Sign up
echo -e "\n${GREEN}1. Testing Signup${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST $API_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.accessToken')
echo "✅ Signup successful. Token: ${TOKEN:0:20}..."

# 2. Create expense
echo -e "\n${GREEN}2. Testing Create Expense${NC}"
curl -s -X POST $API_URL/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 45.50,
    "category": "Food",
    "date": "2024-01-15T10:30:00Z",
    "note": "Test expense"
  }' | jq .

# 3. Get budget
echo -e "\n${GREEN}3. Testing Get Budget${NC}"
curl -s -X GET "$API_URL/api/budget?month=1&year=2024" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n${GREEN}✅ All tests completed!${NC}"
```

Save as `test.sh`, make executable with `chmod +x test.sh`, and run with `./test.sh`

