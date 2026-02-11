import axios from 'axios';

// Ensure this matches your Server Port (3001)
const URL = 'http://localhost:3001/api/buy'; 
const TOTAL_REQUESTS = 50;
const USER_ID = 'test_user'; 

async function startFlashSale() {
  console.log(`🔥 BLASTING ${TOTAL_REQUESTS} requests at your engine...`);
  
  const promises = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    // We send them ALL at the same time (no 'await')
    promises.push(
      axios.post(URL, { userId: `${USER_ID}_${i}`, productId: 'sneaker-001' })
        .catch(err => console.log("Request failed:", err.message))
    );
  }

  // Wait for all network requests to finish
  await Promise.all(promises);
  console.log("✅ All 50 requests sent to the server!");
}

startFlashSale();