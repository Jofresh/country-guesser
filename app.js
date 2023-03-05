// State variables
let countriesByContinent = [];
let countryToGuess = {
  name: "",
  continent: "",
  capital: "",
  localPeople: "",
  mapsLink: "",
};
const fetchedContinents = {}; // Cache system

// API Information
const API_URL = "https://restcountries.com/v3.1";
const CONTINENTS = ["africa", "americas", "asia", "europe", "oceania"];

// DOM Elements
let activeContinent = document.querySelector(".continent.active");
const guessForm = document.querySelector("form.guess-form");
const guessInput = document.querySelector("input.guess-input");
const flagImg = document.querySelector("img.flag-img");
const passButton = document.querySelector("button.pass-button");
const continentElements = document.querySelectorAll(
  ".continents-container > .continent"
);
// Result modal
const resultModal = document.querySelector(".result-modal-wrapper");
const resultHeading = document.querySelector(".result-heading");
const resultCountry = document.querySelector(".result-country");
const resultContinent = document.querySelector(".result-continent");
const resultCapital = document.querySelector(".result-capital");
const resultLocalPeople = document.querySelector(".result-local-people");
const playAgainButton = document.querySelector(".play-again-button");
const resultMapsLink = document.querySelector(".result-maps-link");

// DOM Listeners
continentElements.forEach((continentElt) =>
  continentElt.addEventListener("click", handleChangeContinent)
);
guessForm.addEventListener("submit", handleSubmitGuess);
passButton.addEventListener("click", handlePassGuess);
resultModal.addEventListener("click", handleCloseModal);

async function handleChangeContinent(e) {
  const clickedElement = e.target;
  if (clickedElement === activeContinent) return;

  activeContinent.classList.remove("active");
  activeContinent = clickedElement;
  clickedElement.classList.add("active");

  const continent = clickedElement.dataset.value;

  countriesByContinent.length = 0; // Avoid random problems

  // Loading animation until image is loaded
  flagImg.classList.add("loading");
  // Cache, avoids making same HTTP requests while changing continent.
  if (!fetchedContinents[continent]) {
    fetchedContinents[continent] = await getCountriesByContinent(continent);
  }
  countriesByContinent = [...fetchedContinents[continent]]; // why spread? see line 52 -> reference problems if we don't copy the array
  flagImg.classList.remove("loading");

  // Regenerate guess when changing continent
  generateGuess();
  guessInput.focus();
}

function handleCloseModal(e) {
  resultModal.classList.add("hidden");
  generateGuess();
  guessInput.focus();
}

function handlePassGuess(e) {
  revealGuess();
  guessInput.value = "";
  guessInput.focus();
}

function handleSubmitGuess(e) {
  e.preventDefault();

  const userInput = guessInput.value;
  if (userInput === "") return;

  revealGuess(checkIfGuessed(userInput));

  guessInput.value = "";
  guessInput.focus();
}

async function loadFlagImage(svg, alt) {
  const img = new Image();
  return new Promise((resolve) => {
    img.onload = () => {
      flagImg.src = img.src;
      flagImg.alt = `Image du drapeau à deviner: ${alt}`;
      resolve();
    };
    img.src = svg;
  });
}

async function generateGuess() {
  const randomIndex = Math.floor(Math.random() * countriesByContinent.length);
  const randomCountry = countriesByContinent[randomIndex];

  countryToGuess = {
    name: extractCountryName(randomCountry),
    continent: activeContinent.innerText,
    capital: randomCountry["capital"][0],
    localPeople: randomCountry["demonyms"]["fra"]
      ? { fra: randomCountry["demonyms"]["fra"]["m"] }
      : { eng: randomCountry["demonyms"]["eng"]["m"] },
    mapsLink: randomCountry["maps"]["googleMaps"],
  };

  // Loading animation until image is loaded
  flagImg.classList.add("loading");
  flagImg.alt = "Chargement de l'image du drapeau à deviner...";
  await loadFlagImage(randomCountry["flags"]["svg"], countryToGuess.name);
  flagImg.classList.remove("loading");
}

// (Algorithme à améliorer)
function checkIfGuessed(input) {
  if (!input || input === "") return false;

  // String formatées sans accent et en minuscule
  const formattedUserInput = normalizeString(input.toLowerCase());
  const formattedCountryToGuess = normalizeString(
    countryToGuess.name.toLowerCase()
  );

  // Dans le meilleur des cas
  if (formattedCountryToGuess === formattedUserInput) return true;

  // Ex: "royaume uni" or "royaumeuni" should be good for "royaume-uni"
  if (
    formattedCountryToGuess.split(" ").length <= 1 &&
    formattedCountryToGuess.includes("-")
  ) {
    return [" ", ""]
      .map((char) => formattedCountryToGuess.replaceAll("-", char))
      .includes(formattedUserInput);
  }

  // Ex: Pour "iles cook", "cook" doit pouvoir passer
  if (isIslandPattern(formattedCountryToGuess)) {
    const regex = /^iles?\s+(d[e'u]s?)?\s*(.+)$/i; // see: https://regex101.com/r/84sZQz/1
    const islandFormatted =
      formattedCountryToGuess.match(regex)[3] ??
      formattedCountryToGuess.match(regex)[2];
    return islandFormatted === formattedUserInput;
  }

  // Exemple : "cité du vatican", "vatican" doit passer
  return formattedCountryToGuess
    .split(" ")
    .filter((word) => word.length > 4)
    .includes(formattedUserInput); // pb: "afrique" pour "afrique du sud" marche...
}

function revealGuess(win = false) {
  if (win) {
    resultHeading.classList.add("win");
    resultHeading.innerText = "Bien joué";
  } else {
    resultHeading.classList.remove("win");
    resultHeading.innerText = "Dommage...";
  }

  let { capital, localPeople } = countryToGuess;
  if (capital.slice(-1) === ".") capital = capital.slice(0, -1); // Washington, D.C. => Washington, D.C
  if (localPeople.fra && localPeople.fra.slice(-1) !== "s")
    localPeople.fra += "s"; // Ghanéen => Ghanéens

  resultCountry.innerText = countryToGuess.name;
  resultContinent.innerText = countryToGuess.continent;
  resultCapital.innerText = capital;
  resultLocalPeople.innerText = localPeople.fra ?? localPeople.eng;
  resultMapsLink.href = countryToGuess.mapsLink;

  resultModal.classList.remove("hidden");
}

// Utils
function normalizeString(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isIslandPattern(str) {
  return /^iles?/.test(str);
}

function extractCountryName(country) {
  const { official, common } = country["translations"]["fra"];
  return (official.length < common.length ? official : common).split(
    /\s*\(|,/
  )[0]; // Ex: "Pays (Enclave)" => Pays
}

// API call to get countries for a selected continent
async function getCountriesByContinent(continent) {
  try {
    const res = await fetch(`${API_URL}/region/${continent}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// Init
(async () => {
  const continent = activeContinent.dataset.value;
  countriesByContinent = await getCountriesByContinent(continent);
  generateGuess();
  guessInput.focus(); // Prevent `link preload` warnings
})();
