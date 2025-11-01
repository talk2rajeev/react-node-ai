const express = require('express');
const cors = require('cors');
const path = require('path');


const app = express();
const port = 3000;
const OLLAMA_API_URL = 'http://127.0.0.1:11434/api/generate';

app.use(cors()); // Enable CORS for the frontend
app.use(express.json());
app.use(express.static(path.join(__dirname, '/'))); // Serve static files (index.html, script.js, style.css)

app.post('/api/generate', async (req, res) => {
    try {
        
        const { prompt, model } = req.body;

        // Forward the request to the local Ollama server
        const ollamaResponse = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model || 'mistral',
                prompt: prompt,
                stream: false // Send full response at once
            })
        });

        if (!ollamaResponse.ok) {
            // If Ollama returns an error, pass it back to the client
            const errorText = await ollamaResponse.text();
            return res.status(ollamaResponse.status).send(errorText);
        }

        const data = await ollamaResponse.json();
        res.json(data); // Send Ollama's response back to the frontend

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Failed to connect to the local LLM service.' });
    }
});

app.get('/test', async (req, res) => {
    res.json({msg: 'hello'});
});

app.listen(port, () => {
    console.log(`Web app listening at http://localhost:${port}`);
});
