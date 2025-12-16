class ReadMore extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.classList.remove("hidden");

    const textBlock = this.querySelector(".text-block");
    if (!textBlock) return;

    const limit = parseInt(this.dataset.limit ?? "185");
    const text = (textBlock.textContent ?? "").trim();

    if (text.length <= limit || text.length - limit < 20) return;

    const fullText = text;
    const truncatedText = text.slice(0, limit).trim() + "...";

    textBlock.innerHTML = "";

    // Text container
    const textSpan = document.createElement("span");
    textSpan.textContent = truncatedText + " ";

    // Link
    const link = document.createElement("a");
    link.href = "javascript:void(0)";
    link.textContent = this.dataset.moreLabel || "Read more";
    link.classList.add("read-more-desc");

    // Append link to span
    textSpan.appendChild(link);

    // Append span to textBlock
    textBlock.appendChild(textSpan);

    let expanded = false;
    link.addEventListener("click", () => {
      expanded = !expanded;

      if (expanded) {
        textSpan.textContent = fullText + " ";
        link.textContent = this.dataset.lessLabel || "Read less";
        link.style.display = "inline-block";
        textSpan.appendChild(link); // Re-append link after text change
      } else {
        textSpan.textContent = truncatedText + " ";
        link.textContent = this.dataset.moreLabel || "Read more";
        link.style.display = "";
        textSpan.appendChild(link); // Re-append link after text change
      }
    });
  }
}

customElements.define("read-more", ReadMore);
