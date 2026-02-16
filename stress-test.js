// stress-test.js
const API_URL = "http://localhost:3001/api/buy";
const TOTAL_REQUESTS = 105; 
const PRODUCT_ID = "bea869fb-e8fe-4d54-bb13-b6c247663380"; // 👈 Your Neon UUID

async function buyItem(i) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
          "Idempotency-Key": `key_${Date.now()}_${i}` 
      },
      body: JSON.stringify({ 
          userId: `test_user_${Date.now()}_${i}`,
          productId: PRODUCT_ID, // 👈 Using the correct ID
          quantity: 1 
      }),
    });
    
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = { error: "Could not parse JSON response" };
    }
    
    if (response.ok) {
       console.log(`Request ${i}: ✅ SUCCESS!`);
    } else {
       console.log(`Request ${i}: ❌ FAILED - Status: ${response.status} | Reason: ${JSON.stringify(data)}`);
    }
    
  } catch (error) {
    console.error(`Request ${i} Network Error: ${error.message}`);
  }
}

async function runTest() {
  console.log(`🚀 Starting Stress Test against ${API_URL}...`);
  console.log(`📦 Targeted Product ID: ${PRODUCT_ID}`);
  
  const promises = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    promises.push(buyItem(i));
  }

  await Promise.all(promises);
  console.log("---------------------------------------------------");
  console.log("✅ Test Complete. Check your Worker Terminal for DB updates!");
}

runTest();