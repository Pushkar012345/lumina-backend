const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const OpenAI = require('openai');
const connectDB = require('./config/db');
const StudyGuide = require('./models/StudyGuide');
require('dotenv').config();

const app = express();

// 1. DATABASE CONNECTION
connectDB();

// 2. CORS CONFIGURATION (Must be at the very top)
app.use(cors({
  origin: "https://lumina-frontend-ten.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle Preflight requests globally
app.options('*', cors());

// 3. SECURITY & PARSING MIDDLEWARE
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());

// 4. RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50, 
    message: { error: "Too many requests. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// 5. AI CONFIGURATION
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

// 6. ROUTES

// Root Route
app.get('/', (req, res) => {
  res.status(200).send('🚀 Lumina AI Backend is Live and Running!');
});

// Generate AI Content
app.post('/api/generate', limiter, async (req, res) => {
    const { topic, userId } = req.body;
    
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const cleanTopic = topic?.toString().trim().substring(0, 100);

    try {
        const response = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a study assistant. Return a VALID JSON object. 
                    The 'summary' field must be a detailed Markdown string with bold keywords.
                    The 'flashcards' field must be an array of 3 objects (question/answer).
                    The 'quiz' field must be an array of 3 objects with 'question', 'options' (4 strings), and 'correctAnswer'.`
                },
                { role: "user", content: `Create a structured study guide and quiz for: ${cleanTopic}` }
            ],
            response_format: { type: "json_object" }
        });

        const aiData = JSON.parse(response.choices[0].message.content);
        const newGuide = new StudyGuide({
            topic: cleanTopic,
            summary: aiData.summary,
            flashcards: aiData.flashcards,
            quiz: aiData.quiz,
            userId: userId
        });

        await newGuide.save();
        res.status(200).json(newGuide);
    } catch (error) {
        console.error("AI Generation Error:", error.message);
        res.status(500).json({ error: "AI Generation Failed" });
    }
});

// Get History
app.get('/api/history', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "User ID required" });

        const history = await StudyGuide.find({ userId: userId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete History
app.delete('/api/history/:id', async (req, res) => {
    try {
        const deletedGuide = await StudyGuide.findByIdAndDelete(req.params.id);
        if (!deletedGuide) return res.status(404).json({ error: "Guide not found" });
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

// 7. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});