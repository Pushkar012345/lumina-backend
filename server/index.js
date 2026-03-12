const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // Security: Protection against XSS/Clickjacking
const rateLimit = require('express-rate-limit'); // Security: Prevent API spam
const OpenAI = require('openai');
const connectDB = require('./config/db');
const StudyGuide = require('./models/StudyGuide');
require('dotenv').config();

const app = express();

// 1. DATABASE CONNECTION
connectDB();

// 2. SECURITY MIDDLEWARE
app.use(helmet()); // Sets secure HTTP headers
app.use(express.json());

// 3. RESTRICTED CORS
// Replace 'http://localhost:5173' with your Vercel URL after deployment
const allowedOrigins = ['http://localhost:5173',"https://your-app-name.vercel.app"]; 
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS security policy'));
        }
    },
    credentials: true
}));

// 4. RATE LIMITING
// Limits users to 50 requests every 15 minutes to protect your API costs
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

// 6. THE MAIN AI ROUTE (Limited to prevent abuse)
app.post('/api/generate', limiter, async (req, res) => {
    const { topic, userId } = req.body;
    
    // Simple Input Sanitization
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
        console.error("Security/AI Error:", error.message);
        res.status(500).json({ error: "AI Generation Failed" });
    }
});

// 7. GET HISTORY
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

// 8. DELETE HISTORY
app.delete('/api/history/:id', async (req, res) => {
    try {
        const deletedGuide = await StudyGuide.findByIdAndDelete(req.params.id);
        if (!deletedGuide) return res.status(404).json({ error: "Guide not found" });
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

// This handles the request to the base URL (https://your-app.onrender.com/)
app.get('/', (req, res) => {
  res.status(200).send('🚀 Lumina AI Backend is Live and Running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Secure Server on http://localhost:${PORT}`));