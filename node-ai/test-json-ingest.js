
async function testJSONIngest() {
    const baseUrl = 'http://localhost:3000';

    // 1. Ingest JSON Data
    console.log('Ingesting JSON data...');
    const ingestRes = await fetch(`${baseUrl}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: {
                id: 101,
                product: "SuperWidget",
                price: 99.99,
                description: "The best widget in the world."
            }
        })
    });
    console.log('Ingest Response:', await ingestRes.json());

    // 2. Ask Question
    console.log('\nAsking question...');
    const generateRes = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: "What is the price of the SuperWidget?",
            model: "llama2" 
        })
    });
    
    const data = await generateRes.json();
    console.log('LLM Response:', data.response);
}

// Wait for server to start
setTimeout(testJSONIngest, 5000);
