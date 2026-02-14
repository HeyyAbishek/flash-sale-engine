// stress-test.js
// ⚠️ MAKE SURE YOUR SERVER IS RUNNING ON PORT 3001!

const API_URL = "http://localhost:3001/api/buy";
const TOTAL_REQUESTS = 105; 

async function buyItem(i) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
          // 👇 THIS HEADER IS REQUIRED FOR SECURITY
          "Idempotency-Key": `key_${Date.now()}_${i}` 
      },
      body: JSON.stringify({ 
          userId: `test_user_${Date.now()}_${i}`, // Unique User ID every time
          productId: "sneaker-001",
          quantity: 1 
      }),
    });
    
    // Attempt to parse JSON response to see the error message
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = { error: "Could not parse JSON response" };
    }
    
    if (response.ok) {
       console.log(`Request ${i}: ✅ SUCCESS!`);
    } else {
       // 👇 This prints the REAL reason if it fails
       console.log(`Request ${i}: ❌ FAILED - Status: ${response.status} | Reason: ${JSON.stringify(data)}`);
    }
    
  } catch (error) {
    console.error(`Request ${i} Network Error: ${error.message}`);
  }
}

async function runTest() {
  console.log(`🚀 Starting Stress Test against ${API_URL}...`);
  const promises = [];
  
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    promises.push(buyItem(i));
  }

  await Promise.all(promises);
  console.log("✅ Test Complete. Check your Database Stock!");
}

runTest();