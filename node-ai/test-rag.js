
async function testRAG() {
    const baseUrl = 'http://localhost:3000';

    // 1. Ingest Data
    console.log('Ingesting data...');
    const ingestRes = await fetch(`${baseUrl}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: "The secret code for the vault is 998877."
        })
    });
    console.log('Ingest Response:', await ingestRes.json());

    // 2. Ask Question
    console.log('\nAsking question...');
    const generateRes = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: "What is the secret code for the vault?",
            model: "llama2" 
        })
    });
    
    const data = await generateRes.json();
    console.log('LLM Response:', data.response);
}

// Wait for server to start
setTimeout(testRAG, 5000);
