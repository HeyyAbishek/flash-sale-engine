// test-idempotency.js
const API_URL = "http://localhost:3001/api/buy";

// 🔑 WE USE A STATIC KEY (Does not change!)
// I changed the key slightly so it's a "fresh" test for the server
const STATIC_KEY = "idempotency_test_key_REAL_ID_1"; 
const USER_ID = "sneaker_fan_01";

// 👇 YOUR REAL PRODUCT ID FROM NEON
const REAL_PRODUCT_ID = "bea869fb-e8fe-4d54-bb13-b6c247663380";

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
          productId: REAL_PRODUCT_ID, // ✅ Now using the correct ID
          quantity: 1 
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
       console.log(`Request ${i}: ✅ SUCCESS (Sent to Queue)`);
    } else {
       // We EXPECT this to fail for requests 2, 3, 4, 5
       console.log(`Request ${i}: 🛡️ BLOCKED (Idempotency Working) - Reason: ${data.message}`);
    }
    
  } catch (error) {
    console.error(`Request ${i} Error: ${error.message}`);
  }
}

async function runTest() {
  console.log(`🚀 Testing Idempotency with Key: ${STATIC_KEY}`);
  console.log(`📦 Buying Product: ${REAL_PRODUCT_ID}`);
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