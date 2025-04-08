new autoComplete({
    data: {
      src: films, // from home.html
    },
    selector: "#autoComplete",
    threshold: 2,
    debounce: 100,
    searchEngine: "strict",
    resultsList: {
        render: true,
        container: source => {
            source.setAttribute("id", "food_list");
        },
        destination: document.querySelector("#autoComplete"),
        position: "afterend",
        element: "ul"
    },
    maxResults: 5,
    highlight: true,
    resultItem: {
        content: (data, source) => {
            source.innerHTML = data.match;
        },
        element: "li"
    },
    noResults: () => {
        const result = document.createElement("li");
        result.setAttribute("class", "no_result");
        result.setAttribute("tabindex", "1");
        result.innerHTML = "No Results";
        document.querySelector("#autoComplete_list").appendChild(result);
    },
    onSelection: feedback => {
        const input = document.getElementById('autoComplete');
        input.value = feedback.selection.value;

        // Save to search history
        let history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
        let val = feedback.selection.value;
        if (!history.includes(val)) {
            history.unshift(val);
            if (history.length > 10) history.pop();
            localStorage.setItem("searchHistory", JSON.stringify(history));
        }
    }
});

// Show/hide search history
const inputField = document.getElementById('autoComplete');
inputField.addEventListener('focus', () => {
    if (inputField.value.trim().length === 0) {
        showSearchHistory();
    }
});

inputField.addEventListener('input', () => {
    hideSearchHistory();
});

function showSearchHistory() {
    const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    const list = document.createElement("ul");
    list.setAttribute("id", "history_list");


    list.style.position = "absolute";
    list.style.width = inputField.offsetWidth + "px";
    list.style.zIndex = 9999;


    history.forEach(term => {
        const li = document.createElement("li");
        li.textContent = term;
        li.style.padding = "5px 10px";
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            inputField.value = term;
            hideSearchHistory();
            // Trigger the autocomplete event
            inputField.dispatchEvent(new Event("input"));
        });
        list.appendChild(li);
    });

    hideSearchHistory();
    inputField.parentNode.appendChild(list);
}

function hideSearchHistory() {
    const oldList = document.getElementById("history_list");
    if (oldList) oldList.remove();
}
