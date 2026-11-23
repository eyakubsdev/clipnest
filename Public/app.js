const form = document.querySelector("#download-form");
const input = document.querySelector("#media-url");
const result = document.querySelector("#result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  result.hidden = false;
  result.textContent = "Checking this source…";

  try {
    const response = await fetch("/api/validate-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.value.trim() })
    });
    const data = await response.json();

    if (!response.ok) {
      result.textContent = data.error || "This link could not be accepted.";
      return;
    }

    result.replaceChildren();
    const message = document.createElement("p");
    message.textContent = data.message;
    const link = document.createElement("a");
    link.href = data.destination;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Continue to permitted file ↗";
    result.append(message, link);
  } catch {
    result.textContent = "Could not contact ClipNest. Please try again.";
  }
});