const fs = require('fs');
const raw = fs.readFileSync('./gateBuddy_API.postman_collection.json', 'utf8');

console.log('File loaded, length:', raw.length);

const cutIndex = raw.indexOf(',\r\n        {\r\n          "name": "GET /faqs/:id');
console.log('Cut at:', cutIndex);

const goodPart = raw.substring(0, cutIndex);

const ending = `]
    },
    {
      "name": "FAQ",
      "description": "Frequently asked questions",
      "item": [
        {
          "name": "GET /faqs - Get All FAQs",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/faqs",
              "host": ["{{base_url}}"],
              "path": ["faqs"]
            }
          },
          "description": "Get all FAQs. Public endpoint."
        },
        {
          "name": "GET /faqs/:id - Get Single FAQ",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/faqs/607f1f77bcf86cd799439500",
              "host": ["{{base_url}}"],
              "path": ["faqs", "607f1f77bcf86cd799439500"]
            }
          },
          "description": "Get a single FAQ by ID. Public endpoint."
        }
      ]
    },
    {
      "name": "HOME",
      "description": "Home feed with optional auth",
      "item": [
        {
          "name": "GET /home - Get Home Data",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/home",
              "host": ["{{base_url}}"],
              "path": ["home"]
            }
          },
          "description": "Auth optional. Returns user tracked flight if token provided."
        }
      ]
    }
  ],
  "variable": [
    { "key": "base_url", "value": "http://localhost:3001/api/v1", "type": "string" },
    { "key": "token", "value": "", "type": "string" },
    { "key": "user_id", "value": "", "type": "string" }
  ]
}`;

const fixed = goodPart + ending;

try {
    JSON.parse(fixed);
    fs.writeFileSync('./gateBuddy_API_fixed.postman_collection.json', fixed);
    console.log('Done! Import gateBuddy_API_fixed.postman_collection.json into Postman');
} catch (e) {
    console.log('Error:', e.message);
}