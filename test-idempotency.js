// test-idempotency.js
const API_URL = "http://localhost:3001/api/buy";

// 🔑 WE USE A STATIC KEY (Does not change!)
const STATIC_KEY = "idempotency_test_key_999"; 
const USER_ID = "sneaker_fan_01";

async function sendRequest(i) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
          "Idempotency-Key": STATIC_KEY // 👈 SAME KEY EVERY TIME
      },
      body: JSON.stringify({ 
          userId: USER_ID,
          productId: "sneaker-001",
          quantity: 1 
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
       console.log(`Request ${i}: ✅ SUCCESS (Stock Decreased)`);
    } else {
       // We EXPECT this to fail for requests 2, 3, 4, 5
       console.log(`Request ${i}: 🛡️ BLOCKED (Idempotency Working) - Reason: ${JSON.stringify(data)}`);
    }
    
  } catch (error) {
    console.error(`Request ${i} Error: ${error.message}`);
  }
}

async function runTest() {
  console.log(`🚀 Testing Idempotency with Key: ${STATIC_KEY}`);
  console.log("---------------------------------------------------");

  // Send 5 requests back-to-back
  const promises = [];
  for (let i = 1; i <= 5; i++) {
    promises.push(sendRequest(i));
  }

  await Promise.all(promises);
  console.log("---------------------------------------------------");
  console.log("✅ Test Complete. Check your Database Stock!");
  console.log("   -> If stock dropped by 1, Idempotency WORKS.");
  console.log("   -> If stock dropped by 5, Idempotency FAILED.");
}

runTest();