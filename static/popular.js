// static/popular.js
// 1) We keep an internal 'page' variable for TMDB top_rated pages
// 2) On DOM load, we fetch page=1
// 3) Each time "Load More" is clicked, page++ and fetch again
// 4) We build same style of card => "width:15rem; margin:10px;" etc.
// 5) The card sets 'title' to the movie's original_title for your recommendcard(e)

$(document).ready(function() {
  let page = 1; // track current page
  const apiKey = "514500528da8f14e56884da74c72918c";
  const grid = $("#popular_grid");
  const loadMoreBtn = $("#loadMoreBtn");

  // on page load, fetch first page
  fetchTopRated(page);

  // when "Load More" is clicked
  loadMoreBtn.on("click", function() {
    page++;
    fetchTopRated(page);
  });

  function fetchTopRated(pageNum) {
    const url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&language=en-US&page=${pageNum}`;

    $.get(url, function(response) {
      // returns results array
      if (response.results && response.results.length > 0) {
        response.results.forEach(movie => {
          // build a card
          const card = document.createElement("div");
          card.classList.add("card");
          card.style.width = "15rem";
          card.style.margin = "10px";
          // we want same onclick as recommended, so reuse your function
          card.setAttribute("title", movie.original_title);
          card.setAttribute("onclick", "recommendcard(this)");

          // poster
          const poster = document.createElement("img");
          poster.className = "card-img-top";
          poster.alt = movie.original_title;
          poster.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
          // match your recommended style (height=360, width=240)
          poster.style.height = "360px";

          // body
          const body = document.createElement("div");
          body.className = "card-body";

          const titleEl = document.createElement("h6");
          titleEl.className = "card-title text-center";
          titleEl.textContent = movie.original_title;

          body.appendChild(titleEl);
          card.appendChild(poster);
          card.appendChild(body);
          grid.append(card);
        });
      } else {
        console.log("No more results from TMDB top_rated");
        // you could hide the Load More button if none
        if (response.total_pages && pageNum >= response.total_pages) {
          loadMoreBtn.hide();
        }
      }
    }).fail(function() {
      alert("Failed to fetch top-rated movies from TMDB");
    });
  }
});
