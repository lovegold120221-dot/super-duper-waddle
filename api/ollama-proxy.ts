// Vercel Serverless Function - Ollama Proxy
// File: api/ollama-proxy.ts

export const config = {
  runtime: 'nodejs18',
};

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, model, prompt, stream, options } = req.body;

    // Ollama server URL (configure in environment)
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }

    // Construct the Ollama API URL
    const ollamaUrl = `${OLLAMA_URL}${endpoint}`;
    
    console.log(`Proxying request to: ${ollamaUrl}`);

    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream,
        options: {
          temperature: 0.85,
          top_p: 0.92,
          num_predict: 2500,
          repeat_penalty: 1.1,
          ...options
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    if (stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/plain');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value, { stream: true });
          res.write(text);
        }
      } finally {
        reader.releaseLock();
      }
      
      return res.end();
    } else {
      // Handle non-streaming response
      const data = await response.json();
      return res.status(200).json(data);
    }

  } catch (error) {
    console.error('Ollama proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
