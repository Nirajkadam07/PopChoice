import movies from "./content.mjs";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { readFile } from "fs/promises";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import express from "express";
import cors from "cors";
import { create } from "domain";

const app = express();
app.use(express.json());
app.use(cors());

/** OpenAI config */
if (!process.env.OPENAI_API_KEY)
  throw new Error("OpenAI API key is missing or invalid.");
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Supabase config */
const privateKey = process.env.SUPABASE_API_KEY;
if (!privateKey) throw new Error(`Expected env var SUPABASE_API_KEY`);
const url = process.env.SUPABASE_URL;
if (!url) throw new Error(`Expected env var SUPABASE_URL`);
export const supabase = createClient(url, privateKey);

async function createAndStoreEmbeddings(movies) {
  const data = await Promise.all(
    movies.map(async (movie) => {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: `${movie.title}. ${movie.content}`,
      });
      return {
        title: movie.title,
        content: movie.content,
        embedding: embeddingResponse.data[0].embedding,
      };
    })
  );
  await supabase.from("movielist").insert(data);
  console.log("Success");
}
// createAndStoreEmbeddings(movies);

/* Creating embedding for user input, finding match in vector database, getting response from openai */
// creating embedding for user input
app.post("/api/embedding", async (req, res) => {
  try {
    const { input } = req.body;
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input,
    });
    res.json({ embedding: embeddingResponse.data[0].embedding });
  } catch (err) {
    res.status(500).json({ error: "Failed to get embedding" });
  }
});

// Finding match in vector database
app.post("/api/nearestMatch", async (req, res) => {
  try {
    const { embedding } = req.body;
    const { data } = await supabase.rpc("match_movielist", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 1,
    });
    const match = data[0];
    res.json({ match });
  } catch (err) {
    res.status(500).json({ error: "Failed to get match" });
  }
});

// Getting response from openai
const chatMessages = [
  {
    role: "system",
    content: `You are an enthusiastic movies expert who loves recommending movies to people. You will be given three pieces of information - movie name, movie description and movie selection context. Your main job is to formulate a short answer (25 to 30 words) as to why the movie is best match for the given context. If you are unsure and cannot find the answer in the context, say, "Sorry, I don't know the answer." Please do not make up the answer.`,
  },
];

app.post("/api/finalResponse", async (req, res) => {
  try {
    const { match, input } = req.body;
    chatMessages.push({
      role: "user",
      content: `Movie name: ${match.title}, Movie description: ${match.content} context: ${input}`,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: chatMessages,
      temperature: 1,
      frequency_penalty: 0.5,
    });
    res.json({ finalResponse: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: "Failed to get response from openai" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
