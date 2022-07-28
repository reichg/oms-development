const textareaEl = document.getElementById("input-text");
const submitBtn = document.getElementById("submit");
const outputHolderEl = document.getElementById("output-holder");
const loadingSpinner = document.querySelector(".spin-holder");
const countryNameCheckEl = document.getElementById("country-name");

submitBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  console.clear();

  outputHolderEl.innerHTML = "";
  submitBtn.disabled = true;

  try {
    if (textareaEl.value.trim() === "") {
      throw new Error("Invalid Input...");
    }

    outputHolderEl.innerHTML = `
      <div class="output">
        <h1>Loading...</h1>
      </div>
    `;

    let flags = "";
    if (countryNameCheckEl.checked) flags += "c";

    const issues =
      `${flags.length > 0 ? `${flags},` : "null,"}` +
      textareaEl.value
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item !== "")
        .map((item) => item.split("https://www.openstreetmap.org/")[1])
        .map((item) => (item.split(" ").length > 1 ? item.split(" ")[0] : item))
        .map((item) => item.trim())
        .map((item) => `${item[0]}${item.split("/")[1]}`)
        .join(",");

    console.log(issues);

    const requestUrl = `https://oms-review-backend.herokuapp.com/`;
    // const requestUrl = `http://localhost:3000/`;
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ issues }),
    });

    if (response.status !== 200) throw new Error("Something went wrong...");
    const { status, message, output } = await response.json();

    const html = `
      <div class="output">
        <h1>Status: ${status}</h1>
        <hr>
        <div class="results">
          ${
            status === "success"
              ? output
                  .map((item) => `<p class="output-item">${item}</p>`)
                  .join(" ")
              : `<h1>No results found.</h1>`
          }
        </div>
        <hr>
        <h1>${message}</h1>
      </div>
    `;
    outputHolderEl.innerHTML = "";
    outputHolderEl.insertAdjacentHTML("afterbegin", html);
  } catch (e) {
    outputHolderEl.innerHTML = `
      <div class="output">
       <h1>${e.message}</h1>
      </div>
    `;
  } finally {
    textareaEl.value = "";
    submitBtn.disabled = false;
  }
});
