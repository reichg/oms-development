const textareaEl = document.getElementById("input");
const submitBtn = document.getElementById("submit");
const outputHolderEl = document.getElementById("output-holder");
const loadingSpinner = document.querySelector(".spin-holder");

// const spinnerHtml = `<div class="spin-holder hide">
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     class="spinner"
//     viewBox="0 0 512 512"
//   >
//     <path
//       d="M304 48C304 74.51 282.5 96 256 96C229.5 96 208 74.51 208 48C208 21.49 229.5 0 256 0C282.5 0 304 21.49 304 48zM304 464C304 490.5 282.5 512 256 512C229.5 512 208 490.5 208 464C208 437.5 229.5 416 256 416C282.5 416 304 437.5 304 464zM0 256C0 229.5 21.49 208 48 208C74.51 208 96 229.5 96 256C96 282.5 74.51 304 48 304C21.49 304 0 282.5 0 256zM512 256C512 282.5 490.5 304 464 304C437.5 304 416 282.5 416 256C416 229.5 437.5 208 464 208C490.5 208 512 229.5 512 256zM74.98 437C56.23 418.3 56.23 387.9 74.98 369.1C93.73 350.4 124.1 350.4 142.9 369.1C161.6 387.9 161.6 418.3 142.9 437C124.1 455.8 93.73 455.8 74.98 437V437zM142.9 142.9C124.1 161.6 93.73 161.6 74.98 142.9C56.24 124.1 56.24 93.73 74.98 74.98C93.73 56.23 124.1 56.23 142.9 74.98C161.6 93.73 161.6 124.1 142.9 142.9zM369.1 369.1C387.9 350.4 418.3 350.4 437 369.1C455.8 387.9 455.8 418.3 437 437C418.3 455.8 387.9 455.8 369.1 437C350.4 418.3 350.4 387.9 369.1 369.1V369.1z"
//     />
//   </svg>
// </div>`;

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

    const issues = textareaEl.value
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item !== "")
      .map((item) => item.split("https://www.openstreetmap.org/")[1])
      .map((item) => (item.split(" ").length > 1 ? item.split(" ")[0] : item))
      .map((item) => item.trim())
      .map((item) => `${item[0]}${item.split("/")[1]}`)
      .join(",");

    const requestUrl = `http://localhost:3000/`;
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

    console.log(status, message, output);
  } catch (e) {
    outputHolderEl.innerHTML = `<h1>${e.message}</h1>`;
  } finally {
    textareaEl.value = "";
    submitBtn.disabled = false;
  }
});

// const requestUrl = `https://snehit-tadepalli-oms-development-gj7wgw5pfppvq-3000.githubpreview.dev/${issues}`;
//   const response = await fetch(requestUrl);
//   if (response.status !== 200) {
//     outputHolderEl.innerHTML = "";
//     const html = `<div id="outputs">
//       <p class="output-item" id="invalid-input">Something Went Wrong...</p>
//     </div>`;
//     outputHolderEl.insertAdjacentHTML("afterbegin", html);
//     return;
//   }
//   const data = await response.json();

//   const { status, message, output } = data;
//   console.log(status, message, output);

//   if (status === "failed") {
//     const html = `<div id="outputs">
//       <p class="output-item" id="invalid-input">${output}</p>
//     </div>`;
//     outputHolderEl.innerHTML = "";
//     outputHolderEl.insertAdjacentHTML("afterbegin", html);
//     return;
//   }

//   const html = `<div id="outputs">
//   ${output.map((item) => `<p class="output-item">${item}.</p>`).join("")}
//   </div>`;
//   outputHolderEl.innerHTML = "";
//   outputHolderEl.insertAdjacentHTML("afterbegin", html);

/* Sample test cases
https://www.openstreetmap.org/relation/148838
https://www.openstreetmap.org/relation/6542846
*/

// buttonEl.addEventListener("click", async (e) => {
//   e.preventDefault();
//   responseEl.innerHTML = "";
//   let inputedText = `${inputEl.value}`.trim();

//   try {
//     if (inputedText === "") throw new Error("Invalid input...");
//     responseEl.innerHTML = `Loading...`;
//     // const url = `http://127.0.0.1:3000/api/v1/${inputedText}`;
//     const url = `https://blu-ai-backend.herokuapp.com/api/v1/${inputedText}`;
//     const request = await fetch(url);
//     const data = await request.json();

//     if (data.status === "Success") {
//       const responseHTML = `

//         <h4 class="status-heading">Status: ${data.status}</h4>
//         <ul class="output">
//           ${data.state.output.map((item) => `<li>${item}</li>`).join("")}
//         </ul>

//         <hr />
//       `;

//       const additionalInfo = `
//         <h4>Additional Info</h4>
//         <div class="additional-info">

//           <p>Ignored Languages</p>
//           <p>Ignored wiki languages</p>
//           <p>New Languages</p>

//           <ul class="ignored-languages">
//             ${data.state.ignoredLanguages
//               .map((item) => `<li>${item}</li>`)
//               .join("")}
//           </ul>

//           <ul class="ignored-wiki-languages">
//             ${data.state.excludedWikiItems
//               .map((item) => `<li>${item}</li>`)
//               .join("")}
//           </ul>

//           <ul class="new-languages">
//             ${data.state.newLanguages
//               .map((item) => `<li>${item}</li>`)
//               .join("")}
//           </ul>
//         </div>
//         <p>
//           Found ${data.state.wikiItemsFound} languages from wiki item:
//           <a href="https://www.wikidata.org/wiki/${
//             data.state.wikiItemId
//           }" target="_self">${data.state.wikiItemId}</a>
//         </p>
//       `;

//       responseEl.innerHTML = responseHTML;
//       responseEl.insertAdjacentHTML("beforeend", additionalInfo);
//     } else {
//       throw new Error(data.message);
//     }
//   } catch (e) {
//     responseEl.innerHTML = e.message;
//   }

//   inputEl.value = "";
// });
