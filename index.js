const inputForm = document.querySelector(".input-form");
const favMovie = document.getElementById("fav-movie");
const movieTimeframe = document.getElementById("movie_timeframe");
const movieGener = document.getElementById("movie_gener");
const submitBtn = document.getElementById("submit-btn");
const loadingPanel = document.getElementById("loading-panel");
const resultSection = document.getElementById("result-section");
const goAgainBtn = document.getElementById("go-again-btn");
const finalMovieTitle = document.getElementById("final-movie-title");
const finalMovieDesc = document.getElementById("final-movie-desc");

// Getting the user query
inputForm.addEventListener("submit", (e) => {
  e.preventDefault();
  let userQuery = "";
  userQuery = `${favMovie.value}. ${movieTimeframe.value}. ${movieGener.value}.`;
  inputForm.style.display = "none";
  loadingPanel.style.display = "flex";
  favMovie.value = "";
  movieTimeframe.value = "";
  movieGener.value = "";
  // main(userQuery);
});

goAgainBtn.addEventListener("click", () => {
  finalMovieTitle.textContent = "";
  finalMovieDesc.textContent = "";
  resultSection.style.display = "none";
  inputForm.style.display = "flex";
});

// Creating embedding for user input, finding match in vector database, getting response from openai
async function main(input) {
  const embedding = await getEmbedding(input);
  const match = await findNearestMatch(embedding);
  const finalResponse = await chatCompletion(match, input);
  updateDOM(match.title, finalResponse);
}

async function getEmbedding(input) {
  try {
    const response = await fetch("http://localhost:3000/api/embedding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const result = await response.json();
    return result.embedding;
  } catch (err) {
    console.log("Error: ", err);
  }
}

async function findNearestMatch(embedding) {
  try {
    const response = await fetch("http://localhost:3000/api/nearestMatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embedding }),
    });
    const result = await response.json();
    return result.match;
  } catch (err) {
    console.log("Error: ", err);
  }
}

async function chatCompletion(match, input) {
  try {
    const response = await fetch("http://localhost:3000/api/finalResponse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match, input }),
    });
    const result = await response.json();
    return result.finalResponse;
  } catch (err) {
    console.log("Error: ", err);
  }
}

function updateDOM(title, description) {
  finalMovieTitle.textContent = `${title}`;
  finalMovieDesc.textContent = `${description}`;
  loadingPanel.style.display = "none";
  resultSection.style.display = "flex";
}
