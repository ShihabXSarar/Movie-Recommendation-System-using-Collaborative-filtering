$(function() {
  // Button will be disabled until we type anything inside the input field
  const source = document.getElementById('autoComplete');
  source.addEventListener('input', function(e) {
    $('.movie-button').attr('disabled', e.target.value === "");
  });

  $('.movie-button').on('click', function() {
    var my_api_key = '514500528da8f14e56884da74c72918c';
    var title = $('.movie').val();
    if (title === "") {
      $('.results').hide();
      $('.fail').show();
    } else {
      load_details(my_api_key, title);
    }
  });
});

// Trigger movie details load when clicking on recommended movies
function recommendcard(e) {
  var my_api_key = '514500528da8f14e56884da74c72918c';
  var title = e.getAttribute('title');
  load_details(my_api_key, title);
}

// Fetch basic details of the movie from TMDB
function load_details(my_api_key, title) {
  $.ajax({
    type: 'GET',
    url: `https://api.themoviedb.org/3/search/movie?api_key=${my_api_key}&query=${title}`,
    success: function(response) {
      if (response.results.length === 0) {
        $('.fail').show();
        $('.results').hide();
      } else {
        $("#loader").fadeIn();
        $('.fail').hide();
        $('.results').delay(500).show();
        let movie_id = response.results[0].id;
        let movie_title = response.results[0].original_title;
        movie_recs(movie_title, movie_id, my_api_key);
      }
    },
    error: function() {
      alert('Invalid Request');
      $("#loader").fadeOut();
    }
  });
}

// Fetch similar movies
function movie_recs(movie_title, movie_id, my_api_key) {
  $.post("/similarity", { 'name': movie_title }, function(recs) {
    if (recs.includes("Sorry")) {
      $('.fail').show();
      $('.results').hide();
    } else {
      $('.fail').hide();
      $('.results').show();
      let movie_arr = recs.split('---');
      get_movie_details(movie_id, my_api_key, movie_arr, movie_title);
    }
  }).fail(function() {
    alert("Error fetching recommendations");
    $("#loader").fadeOut();
  });
}

// Fetch complete movie details from TMDB
function get_movie_details(movie_id, my_api_key, arr, movie_title) {
  $.get(`https://api.themoviedb.org/3/movie/${movie_id}?api_key=${my_api_key}`, function(movie_details) {
    show_details(movie_details, arr, movie_title, my_api_key, movie_id);
  }).fail(function() {
    alert("API Error!");
    $("#loader").fadeOut();
  });
}

// Fetch movie cast details
function get_movie_cast(movie_id, my_api_key) {
  let cast_ids = [], cast_names = [], cast_chars = [], cast_profiles = [];
  $.ajax({
    type: 'GET',
    url: `https://api.themoviedb.org/3/movie/${movie_id}/credits?api_key=${my_api_key}`,
    async: false,
    success: function(data) {
      let top_cast = data.cast.slice(0, 10); // Get up to 10 main cast members
      top_cast.forEach(cast => {
        cast_ids.push(cast.id);
        cast_names.push(cast.name);
        cast_chars.push(cast.character);
        cast_profiles.push(`https://image.tmdb.org/t/p/original${cast.profile_path}`);
      });
    }
  });
  return { cast_ids, cast_names, cast_chars, cast_profiles };
}

// Fetch individual cast details
function get_individual_cast(cast_ids, my_api_key) {
  let cast_bdays = [], cast_bios = [], cast_places = [];
  cast_ids.forEach(cast_id => {
    $.ajax({
      type: 'GET',
      url: `https://api.themoviedb.org/3/person/${cast_id}?api_key=${my_api_key}`,
      async: false,
      success: function(cast) {
        cast_bdays.push(new Date(cast.birthday).toDateString().split(' ').slice(1).join(' '));
        cast_bios.push(cast.biography);
        cast_places.push(cast.place_of_birth);
      }
    });
  });
  return { cast_bdays, cast_bios, cast_places };
}

// Fetch reviews and send data to backend
function show_details(movie_details, arr, movie_title, my_api_key, movie_id) {
  let tmdb_id = movie_details.id; // Use TMDB ID
  let movie_cast = get_movie_cast(movie_id, my_api_key);
  let ind_cast = get_individual_cast(movie_cast.cast_ids, my_api_key);

  let details = {
    'title': movie_title,
    'tmdb_id': tmdb_id, // Changed from IMDb to TMDB ID
    'poster': `https://image.tmdb.org/t/p/original${movie_details.poster_path}`,
    'genres': movie_details.genres.map(genre => genre.name).join(", "),
    'overview': movie_details.overview || "No overview available.",
    'rating': movie_details.vote_average,
    'vote_count': movie_details.vote_count.toLocaleString(),
    'release_date': new Date(movie_details.release_date).toDateString().split(' ').slice(1).join(' '),
    'runtime': format_runtime(movie_details.runtime),
    'status': movie_details.status || "Unknown",
    'rec_movies': JSON.stringify(arr),
    'rec_posters': JSON.stringify(get_movie_posters(arr, my_api_key)),
    'cast_ids': JSON.stringify(movie_cast.cast_ids),
    'cast_names': JSON.stringify(movie_cast.cast_names),
    'cast_chars': JSON.stringify(movie_cast.cast_chars),
    'cast_profiles': JSON.stringify(movie_cast.cast_profiles),
    'cast_bdays': JSON.stringify(ind_cast.cast_bdays),
    'cast_bios': JSON.stringify(ind_cast.cast_bios),
    'cast_places': JSON.stringify(ind_cast.cast_places)
  };

  $.post("/recommend", details, function(response) {
    $('.results').html(response);
    $('#autoComplete').val('');
    $(window).scrollTop(0);
  }).always(function() {
    $("#loader").fadeOut();
  });
}

// Format runtime display
function format_runtime(runtime) {
  return runtime % 60 === 0 ? `${Math.floor(runtime / 60)} hour(s)` : `${Math.floor(runtime / 60)} hour(s) ${runtime % 60} min(s)`;
}

// Fetch posters for recommended movies
function get_movie_posters(arr, my_api_key) {
  let arr_poster_list = [];
  for (let m of arr) {
    $.ajax({
      type: 'GET',
      url: `https://api.themoviedb.org/3/search/movie?api_key=${my_api_key}&query=${m}`,
      async: false,
      success: function(m_data) {
        arr_poster_list.push(`https://image.tmdb.org/t/p/original${m_data.results[0]?.poster_path}`);
      }
    });
  }
  return arr_poster_list;
}
