import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { OllamaEmbeddings } from '@langchain/ollama';
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const OLLAMA_API_URL = 'http://127.0.0.1:11434/api/generate';

// Keep process alive
setInterval(() => {}, 1000);

// Initialize Embeddings
const embeddings = new OllamaEmbeddings({
    model: "llama2", // Use available model
    baseUrl: "http://127.0.0.1:11434",
});

// Initialize Vector Store (HNSWLib requires initial data, so we seed it)
let vectorStore;
(async () => {
    try {
        vectorStore = await HNSWLib.fromTexts(
            ["Node-AI is a powerful tool."],
            [{ id: 1 }],
            embeddings
        );
        console.log("Vector Store initialized.");
    } catch (e) {
        console.error("Failed to initialize vector store:", e);
    }
})();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Ingest Endpoint
app.post('/api/ingest', async (req, res) => {
    try {
        const { content: rawContent } = req.body;
        const content = rawContent;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (!vectorStore) {
             return res.status(500).json({ error: 'Vector store not initialized yet.' });
        }

        let textContent = content;
        if (typeof content === 'object' && content !== null) {
            textContent = JSON.stringify(content, null, 2);
        } else {
            textContent = String(content);
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const docs = await splitter.createDocuments([textContent]);
        await vectorStore.addDocuments(docs);

        res.json({ message: 'Content ingested successfully', chunks: docs.length });
    } catch (error) {
        console.error('Ingest Error:', error);
        res.status(500).json({ error: 'Failed to ingest content' });
    }
});

// Generate Endpoint with RAG
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, model } = req.body;
        
        if (!vectorStore) {
             return res.status(500).json({ error: 'Vector store not initialized yet.' });
        }

        // 1. Retrieve relevant documents
        const retriever = vectorStore.asRetriever(3); // Retrieve top 3 chunks
        const relevantDocs = await retriever.invoke(prompt);
        
        const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
        
        // 2. Augment the prompt
        const augmentedPrompt = `Context:\n${context}\n\nQuestion: ${prompt}\n\nAnswer the question based on the context provided.`;

        // 3. Forward to Ollama
        const ollamaResponse = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model || 'llama2',
                prompt: augmentedPrompt,
                stream: false
            })
        });

        if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text();
            return res.status(ollamaResponse.status).send(errorText);
        }

        const data = await ollamaResponse.json();
        res.json(data);

    } catch (error) {
        console.error('Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate response.' });
    }
});

app.get('/test', async (req, res) => {
    res.json({msg: 'hello'});
});

app.listen(port, () => {
    console.log(`Web app listening at http://localhost:${port}`);
});
